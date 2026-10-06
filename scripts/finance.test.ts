/**
 * Verifies the balance rules against the worked example in the product spec.
 * Run: npm test
 */
import assert from 'node:assert/strict';

import {
  applyRecurring,
  budgetStatus,
  buildActivity,
  computeBalances,
  dailyLimit,
  nextRecurringDate,
  occurrenceDate,
  validateData,
} from '../src/lib/finance';
import type { Pocket, RecurringRule, Transaction, Transfer, UserData } from '../src/lib/types';

let seq = 0;
const pocket = (name: string, extra: Partial<Pocket> = {}): Pocket => ({
  id: name,
  name,
  icon: '•',
  color: '#000',
  budget: 0,
  isLocked: false,
  isSavings: false,
  archived: false,
  createdAt: '',
  ...extra,
});
const tx = (type: Transaction['type'], amount: number, pocketId: string | null, date = '2026-10-01'): Transaction => ({
  id: `t${++seq}`,
  type,
  amount,
  pocketId,
  categoryId: null,
  date,
  note: '',
  createdAt: `${date}T00:00:${String(seq).padStart(2, '0')}Z`,
});
const transfer = (from: string, to: string, amount: number, date: string): Transfer => ({
  id: `tr${++seq}`,
  fromPocketId: from,
  toPocketId: to,
  amount,
  date,
  note: '',
  createdAt: `${date}T00:00:00Z`,
});

const data: UserData = {
  pockets: [
    pocket('Kebutuhan'),
    pocket('Makanan', { budget: 500_000 }),
    pocket('Transportasi'),
    pocket('Tabungan', { isSavings: true }),
    pocket('Hiburan'),
  ],
  categories: [],
  goals: [],
  recurring: [],
  transactions: [
    tx('INCOME', 4_500_000, null),
    tx('ALLOCATION', 1_000_000, 'Kebutuhan'),
    tx('ALLOCATION', 500_000, 'Makanan'),
    tx('ALLOCATION', 200_000, 'Transportasi'),
    tx('ALLOCATION', 2_000_000, 'Tabungan'),
    tx('ALLOCATION', 800_000, 'Hiburan'),
    tx('EXPENSE', 25_000, 'Makanan', '2026-10-02'),
    tx('EXPENSE', 30_000, 'Transportasi', '2026-10-03'),
    tx('EXPENSE', 50_000, 'Makanan', '2026-10-10'),
  ],
  transfers: [transfer('Hiburan', 'Makanan', 100_000, '2026-10-05')],
};

const b = computeBalances(data);
const bal = (id: string) => b.pockets[id].balance;

// Section 21 / 33 of the spec
assert.equal(bal('Makanan'), 525_000);
assert.equal(bal('Hiburan'), 700_000);
assert.equal(bal('Transportasi'), 170_000);
assert.equal(bal('Kebutuhan'), 1_000_000);
assert.equal(bal('Tabungan'), 2_000_000);

// Totals: transfer changes nothing, pockets + unallocated == total balance
assert.equal(b.totalIncome, 4_500_000);
assert.equal(b.totalExpense, 105_000);
assert.equal(b.totalBalance, 4_395_000);
assert.equal(b.unallocated, 0);
const sumPockets = Object.values(b.pockets).reduce((s, p) => s + p.balance, 0);
assert.equal(sumPockets + b.unallocated, b.totalBalance);

// Section 5: over-allocation is rejected
assert.equal(
  validateData({ ...data, transactions: [...data.transactions, tx('ALLOCATION', 200_000, 'Makanan')] }),
  'Jumlah alokasi melebihi saldo yang tersedia.',
);
// Section 10: overspending a pocket is rejected
assert.match(
  validateData({ ...data, transactions: [...data.transactions, tx('EXPENSE', 200_000, 'Transportasi')] }) ?? '',
  /tidak mencukupi/,
);
assert.equal(validateData(data), null);

// Section 14/15: budget levels and messages
assert.equal(budgetStatus('Makanan', 500_000, 250_000).level, 'safe');
assert.equal(budgetStatus('Makanan', 500_000, 400_000).level, 'watch');
assert.equal(budgetStatus('Makanan', 500_000, 450_000).level, 'near');
assert.equal(budgetStatus('Makanan', 500_000, 500_000).message, 'Budget Makanan telah habis.');
assert.equal(
  budgetStatus('Makanan', 500_000, 525_000).message,
  'Pengeluaran Makanan telah melebihi budget sebesar Rp25.000.',
);

// Section 16: daily limit excludes savings; Oct 10 -> 22 days left
const limit = dailyLimit(data, b, '2026-10-10');
assert.equal(limit.daysLeft, 22);
assert.equal(limit.spendable, 1_000_000 + 525_000 + 170_000 + 700_000);
assert.equal(limit.perDay, Math.floor(limit.spendable / 22));

// History contains every movement, newest first
const activity = buildActivity(data);
assert.equal(activity.length, data.transactions.length + data.transfers.length);
assert.equal(activity[0].date, '2026-10-10');

// Recurring: monthly rules keep their day-of-month without drifting
assert.deepEqual(
  [0, 1, 2, 3].map((n) => occurrenceDate({ startDate: '2026-01-31', frequency: 'MONTHLY' }, n)),
  ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'],
);
assert.equal(occurrenceDate({ startDate: '2026-10-01', frequency: 'WEEKLY' }, 2), '2026-10-15');

const rule = (extra: Partial<RecurringRule>): RecurringRule => ({
  id: `r${++seq}`,
  type: 'EXPENSE',
  amount: 100_000,
  pocketId: 'Kebutuhan',
  categoryId: null,
  note: '',
  frequency: 'MONTHLY',
  startDate: '2026-08-15',
  occurrences: 0,
  endDate: null,
  active: true,
  createdAt: '',
  ...extra,
});
const makeTx = (t: Omit<Transaction, 'id' | 'createdAt'>): Transaction => ({ ...t, id: `g${++seq}`, createdAt: `${t.date}T12:00:00Z` });

// Backfills every due occurrence up to today and advances the rule
const bill = rule({});
const run1 = applyRecurring({ ...data, recurring: [bill] }, '2026-10-20', makeTx);
assert.equal(run1.created, 3); // Aug 15, Sep 15, Oct 15
assert.equal(run1.data.recurring[0].occurrences, 3);
assert.equal(nextRecurringDate(run1.data.recurring[0]), '2026-11-15');
assert.equal(computeBalances(run1.data).pockets.Kebutuhan.balance, 700_000);
// Running again on the same day records nothing new
assert.equal(applyRecurring(run1.data, '2026-10-20', makeTx).created, 0);

// An expense that would overdraw a pocket stops and stays due
const big = rule({ amount: 600_000, pocketId: 'Transportasi' });
const run2 = applyRecurring({ ...data, recurring: [big] }, '2026-10-20', makeTx);
assert.equal(run2.created, 0);
assert.equal(run2.blocked.length, 1);
assert.equal(validateData(run2.data), null);

// Income lands in the unallocated balance; paused rules are skipped and ended rules stop
const salary = rule({ type: 'INCOME', pocketId: null, amount: 1_000_000, startDate: '2026-10-01' });
const paused = rule({ active: false });
const ended = rule({ endDate: '2026-08-31' });
const run3 = applyRecurring({ ...data, recurring: [salary, paused, ended] }, '2026-10-20', makeTx);
assert.equal(run3.created, 2); // salary Oct 1 + ended rule's single Aug 15 occurrence
assert.equal(computeBalances(run3.data).unallocated, 1_000_000);
assert.equal(nextRecurringDate(run3.data.recurring[2]), null);
assert.ok(run3.data.transactions.every((t) => !t.recurringId || t.recurringId !== paused.id));

console.log('✓ finance rules match the spec');
