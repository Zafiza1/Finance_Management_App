/**
 * Verifies the balance rules against the worked example in the product spec.
 * Run: npm test
 */
import assert from 'node:assert/strict';

import { budgetStatus, buildActivity, computeBalances, dailyLimit, validateData } from '../src/lib/finance';
import type { Pocket, Transaction, Transfer, UserData } from '../src/lib/types';

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

console.log('✓ finance rules match the spec');
