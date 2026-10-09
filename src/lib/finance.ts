import { addDays, addMonths, daysInMonth, formatPct, formatRp, parseISODate, toISODate } from './format';
import type { Category, Frequency, Pocket, RecurringRule, Transaction, UserData } from './types';

export interface PocketStats {
  balance: number;
  allocated: number;
  transferIn: number;
  transferOut: number;
  expense: number;
}

export interface Balances {
  totalIncome: number;
  totalExpense: number;
  /** Total Income - Total Expense */
  totalBalance: number;
  /** Money received but not yet assigned to any pocket. */
  unallocated: number;
  pockets: Record<string, PocketStats>;
}

const emptyStats = (): PocketStats => ({
  balance: 0,
  allocated: 0,
  transferIn: 0,
  transferOut: 0,
  expense: 0,
});

/**
 * Every balance is derived from history, never stored:
 *   pocket balance = allocation + transfer in - transfer out - expense
 *   total balance  = income - expense = unallocated + SUM(pocket balances)
 */
export function computeBalances(data: UserData): Balances {
  const pockets: Record<string, PocketStats> = {};
  const stats = (id: string) => (pockets[id] ??= emptyStats());
  for (const p of data.pockets) stats(p.id);

  let totalIncome = 0;
  let totalExpense = 0;
  let totalAllocated = 0;

  for (const t of data.transactions) {
    if (t.type === 'INCOME') {
      totalIncome += t.amount;
    } else if (t.type === 'EXPENSE') {
      totalExpense += t.amount;
      if (t.pocketId) stats(t.pocketId).expense += t.amount;
    } else if (t.type === 'ALLOCATION' && t.pocketId) {
      totalAllocated += t.amount;
      stats(t.pocketId).allocated += t.amount;
    }
  }
  for (const tr of data.transfers) {
    stats(tr.fromPocketId).transferOut += tr.amount;
    stats(tr.toPocketId).transferIn += tr.amount;
  }
  for (const s of Object.values(pockets)) {
    s.balance = s.allocated + s.transferIn - s.transferOut - s.expense;
  }

  return {
    totalIncome,
    totalExpense,
    totalBalance: totalIncome - totalExpense,
    unallocated: totalIncome - totalAllocated,
    pockets,
  };
}

export const pocketBalance = (b: Balances, pocketId: string) => b.pockets[pocketId]?.balance ?? 0;

/**
 * Returns an error message when the data would put money into a negative state,
 * e.g. spending more than a pocket holds or allocating more than was received.
 */
export function validateData(data: UserData): string | null {
  const b = computeBalances(data);
  if (b.unallocated < 0) return 'Jumlah alokasi melebihi saldo yang tersedia.';
  for (const p of data.pockets) {
    if (pocketBalance(b, p.id) < 0) return `Saldo Pocket ${p.name} tidak mencukupi.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Periods

export interface Period {
  start: string;
  end: string;
}

/** month is 0-based */
export function monthPeriod(year: number, month: number): Period {
  return {
    start: toISODate(new Date(year, month, 1)),
    end: toISODate(new Date(year, month, daysInMonth(year, month))),
  };
}

export function currentMonthPeriod(today: string): Period {
  const d = parseISODate(today);
  return monthPeriod(d.getFullYear(), d.getMonth());
}

const inPeriod = (date: string, p: Period) => date >= p.start && date <= p.end;

export function sumByType(data: UserData, type: 'INCOME' | 'EXPENSE', period: Period): number {
  return data.transactions
    .filter((t) => t.type === type && inPeriod(t.date, period))
    .reduce((sum, t) => sum + t.amount, 0);
}

export function pocketSpent(data: UserData, pocketId: string, period: Period): number {
  return data.transactions
    .filter((t) => t.type === 'EXPENSE' && t.pocketId === pocketId && inPeriod(t.date, period))
    .reduce((sum, t) => sum + t.amount, 0);
}

// ---------------------------------------------------------------------------
// Budget

export type BudgetLevel = 'safe' | 'watch' | 'near' | 'done' | 'over';

export interface BudgetStatus {
  budget: number;
  spent: number;
  remaining: number;
  pct: number;
  level: BudgetLevel;
  label: string;
  message: string | null;
}

export const BUDGET_LABELS: Record<BudgetLevel, string> = {
  safe: 'Aman',
  watch: 'Perhatikan pengeluaran',
  near: 'Mendekati batas',
  done: 'Budget habis',
  over: 'Budget terlampaui',
};

export function budgetStatus(name: string, budget: number, spent: number): BudgetStatus {
  const pct = budget > 0 ? (spent / budget) * 100 : 0;
  let level: BudgetLevel = 'safe';
  if (spent > budget) level = 'over';
  else if (spent === budget) level = 'done';
  else if (pct > 80) level = 'near';
  else if (pct > 50) level = 'watch';

  let message: string | null = null;
  if (level === 'done') message = `Budget ${name} telah habis.`;
  if (level === 'over') {
    message = `Pengeluaran ${name} telah melebihi budget sebesar ${formatRp(spent - budget)}.`;
  }
  return {
    budget,
    spent,
    remaining: budget - spent,
    pct,
    level,
    label: BUDGET_LABELS[level],
    message,
  };
}

export function pocketBudgetStatus(data: UserData, pocket: Pocket, today: string): BudgetStatus | null {
  if (pocket.budget <= 0) return null;
  return budgetStatus(pocket.name, pocket.budget, pocketSpent(data, pocket.id, currentMonthPeriod(today)));
}

// ---------------------------------------------------------------------------
// Daily limit

export interface DailyLimit {
  spendable: number;
  daysLeft: number;
  perDay: number;
}

/** Money in regular (unlocked, non-savings) pockets spread over the rest of the month. */
export function dailyLimit(data: UserData, balances: Balances, today: string): DailyLimit {
  const d = parseISODate(today);
  const daysLeft = daysInMonth(d.getFullYear(), d.getMonth()) - d.getDate() + 1;
  const spendable = data.pockets
    .filter((p) => !p.archived && !p.isLocked && !p.isSavings)
    .reduce((sum, p) => sum + Math.max(0, pocketBalance(balances, p.id)), 0);
  return { spendable, daysLeft, perDay: Math.floor(spendable / daysLeft) };
}

// ---------------------------------------------------------------------------
// Activity feed (history)

export type ActivityKind = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'ALLOCATION';

export interface Activity {
  id: string;
  kind: ActivityKind;
  amount: number;
  date: string;
  createdAt: string;
  icon: string;
  title: string;
  subtitle: string;
  note: string;
  pocketIds: string[];
  categoryId: string | null;
  /** Set for photo expenses; the row opens the detail screen instead of an alert. */
  hasPhoto?: boolean;
}

const KIND_LABEL: Record<ActivityKind, string> = {
  INCOME: 'Income',
  EXPENSE: 'Expense',
  TRANSFER: 'Transfer',
  ALLOCATION: 'Alokasi',
};

export function buildActivity(data: UserData): Activity[] {
  const pocketMap = new Map(data.pockets.map((p) => [p.id, p]));
  const catMap = new Map<string, Category>(data.categories.map((c) => [c.id, c]));
  const pocketName = (id: string | null) => (id && pocketMap.get(id)?.name) || 'Pocket terhapus';

  const items: Activity[] = data.transactions.map((t) => {
    const cat = t.categoryId ? catMap.get(t.categoryId) : undefined;
    const pocket = t.pocketId ? pocketMap.get(t.pocketId) : undefined;
    let icon = cat?.icon ?? '💵';
    let title = t.note || cat?.name || KIND_LABEL[t.type];
    let subtitle = cat?.name ?? KIND_LABEL[t.type];
    if (t.type === 'EXPENSE') {
      icon = t.food ? '🍽️' : t.photoUri ? '📷' : cat?.icon ?? pocket?.icon ?? '💸';
      subtitle = [cat?.name, pocketName(t.pocketId)].filter(Boolean).join(' · ');
    } else if (t.type === 'ALLOCATION') {
      icon = pocket?.icon ?? '📥';
      title = `Alokasi ke ${pocketName(t.pocketId)}`;
      subtitle = 'Alokasi';
    }
    if (t.recurringId) subtitle = `🔁 ${subtitle}`;
    return {
      id: t.id,
      kind: t.type,
      amount: t.amount,
      date: t.date,
      createdAt: t.createdAt,
      icon,
      title,
      subtitle,
      note: t.note,
      pocketIds: t.pocketId ? [t.pocketId] : [],
      categoryId: t.categoryId,
      hasPhoto: !!t.photoUri,
    };
  });

  for (const tr of data.transfers) {
    items.push({
      id: tr.id,
      kind: 'TRANSFER',
      amount: tr.amount,
      date: tr.date,
      createdAt: tr.createdAt,
      icon: '🔁',
      title: `${pocketName(tr.fromPocketId)} → ${pocketName(tr.toPocketId)}`,
      subtitle: tr.note ? `Transfer · ${tr.note}` : 'Transfer',
      note: tr.note,
      pocketIds: [tr.fromPocketId, tr.toPocketId],
      categoryId: null,
    });
  }

  return items.sort((a, b) =>
    a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
  );
}

// ---------------------------------------------------------------------------
// Reports

export interface Slice {
  id: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
}

export function expenseByCategory(data: UserData, period: Period): Slice[] {
  const totals = new Map<string, number>();
  for (const t of data.transactions) {
    if (t.type !== 'EXPENSE' || !inPeriod(t.date, period)) continue;
    const key = t.categoryId ?? 'none';
    totals.set(key, (totals.get(key) ?? 0) + t.amount);
  }
  return [...totals.entries()]
    .map(([id, amount]) => {
      const c = data.categories.find((x) => x.id === id);
      return {
        id,
        name: c?.name ?? 'Tanpa kategori',
        icon: c?.icon ?? '❔',
        color: c?.color ?? '#94A3B8',
        amount,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

export function expenseByPocket(data: UserData, period: Period): Slice[] {
  return data.pockets
    .map((p) => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      color: p.color,
      amount: pocketSpent(data, p.id, period),
    }))
    .filter((s) => s.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

/** month is 0-based; `today` decides how many days of the month have elapsed. */
export function buildInsights(data: UserData, year: number, month: number, today: string): string[] {
  const period = monthPeriod(year, month);
  const prev = monthPeriod(month === 0 ? year - 1 : year, (month + 11) % 12);
  const out: string[] = [];

  const byCat = expenseByCategory(data, period);
  const top = byCat[0];
  if (top) {
    out.push(`Pengeluaran ${top.name.toLowerCase()} bulan ini: ${formatRp(top.amount)}.`);
    const before = expenseByCategory(data, prev).find((s) => s.id === top.id)?.amount ?? 0;
    if (before > 0) {
      const change = ((top.amount - before) / before) * 100;
      if (Math.abs(change) >= 1) {
        out.push(
          `Pengeluaran ${top.name.toLowerCase()} ${change > 0 ? 'meningkat' : 'menurun'} ` +
            `${formatPct(Math.abs(Math.round(change)))} dibanding bulan sebelumnya.`,
        );
      }
    }
  }

  const isCurrent = today >= period.start && today <= period.end;
  const elapsed = isCurrent ? parseISODate(today).getDate() : daysInMonth(year, month);
  const spent = sumByType(data, 'EXPENSE', period);
  if (spent > 0) {
    out.push(`Rata-rata pengeluaran harian: ${formatRp(Math.round(spent / elapsed))}.`);
  }

  if (isCurrent) {
    const daysLeft = daysInMonth(year, month) - elapsed;
    for (const p of data.pockets) {
      if (p.archived || p.budget <= 0) continue;
      const used = pocketSpent(data, p.id, period);
      if (used === 0) continue;
      const remaining = p.budget - used;
      if (remaining <= 0) continue;
      out.push(`Budget ${p.name.toLowerCase()} tersisa: ${formatRp(remaining)}.`);
      const daysToEmpty = Math.ceil(remaining / (used / elapsed));
      if (daysToEmpty < daysLeft) {
        out.push(
          `Jika mempertahankan pola pengeluaran saat ini, budget ${p.name.toLowerCase()} ` +
            `diperkirakan habis dalam ${daysToEmpty} hari.`,
        );
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Recurring transactions

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  DAILY: 'Harian',
  WEEKLY: 'Mingguan',
  MONTHLY: 'Bulanan',
  YEARLY: 'Tahunan',
};

/** Date of occurrence n (0-based), always computed from the start date to avoid drift. */
export function occurrenceDate(rule: Pick<RecurringRule, 'startDate' | 'frequency'>, n: number): string {
  switch (rule.frequency) {
    case 'DAILY':
      return addDays(rule.startDate, n);
    case 'WEEKLY':
      return addDays(rule.startDate, n * 7);
    case 'MONTHLY':
      return addMonths(rule.startDate, n);
    case 'YEARLY':
      return addMonths(rule.startDate, n * 12);
  }
}

/** The next date the rule will record, or null when it has ended. */
export function nextRecurringDate(rule: RecurringRule): string | null {
  const date = occurrenceDate(rule, rule.occurrences);
  return rule.endDate && date > rule.endDate ? null : date;
}

export interface RecurringRun {
  data: UserData;
  created: number;
  /** Rules that are due but could not be recorded (e.g. pocket balance too low). */
  blocked: RecurringRule[];
}

const MAX_RECURRING_PER_RUN = 500;

/**
 * Records every due occurrence up to and including `today`, oldest first across
 * all rules, so an income due earlier can fund an expense due later. A rule
 * whose transaction would break a balance rule stops and stays due, so nothing
 * is silently skipped.
 */
export function applyRecurring(
  data: UserData,
  today: string,
  makeTx: (t: Omit<Transaction, 'id' | 'createdAt'>) => Transaction,
): RecurringRun {
  const rules = data.recurring.map((r) => ({ ...r }));
  const blocked = new Set<string>();
  const activePockets = new Set(data.pockets.filter((p) => !p.archived).map((p) => p.id));
  let next = data;
  let created = 0;

  while (created < MAX_RECURRING_PER_RUN) {
    let rule: RecurringRule | undefined;
    let date: string | null = null;
    for (const r of rules) {
      if (!r.active || blocked.has(r.id)) continue;
      const d = nextRecurringDate(r);
      if (d && d <= today && (!date || d < date)) {
        rule = r;
        date = d;
      }
    }
    if (!rule || !date) break;

    if (rule.type === 'EXPENSE' && !(rule.pocketId && activePockets.has(rule.pocketId))) {
      blocked.add(rule.id);
      continue;
    }
    const candidate: UserData = {
      ...next,
      transactions: [
        ...next.transactions,
        makeTx({
          type: rule.type,
          amount: rule.amount,
          pocketId: rule.type === 'EXPENSE' ? rule.pocketId : null,
          categoryId: rule.categoryId,
          date,
          note: rule.note,
          recurringId: rule.id,
        }),
      ],
    };
    if (validateData(candidate)) {
      blocked.add(rule.id);
      continue;
    }
    next = candidate;
    rule.occurrences += 1;
    created += 1;
  }

  return {
    data: { ...next, recurring: rules },
    created,
    blocked: rules.filter((r) => blocked.has(r.id)),
  };
}
