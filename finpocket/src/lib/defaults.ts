import type { Category, CategoryType, Pocket, UserData } from './types';

export const POCKET_COLORS = [
  '#0F766E', '#2563EB', '#7C3AED', '#DB2777', '#DC2626',
  '#EA580C', '#CA8A04', '#16A34A', '#0891B2', '#475569',
];

export const POCKET_ICONS = [
  '🏠', '🍜', '⛽', '💡', '🎮', '💰', '🛟', '📦', '💼', '🛒',
  '💊', '📚', '💻', '✈️', '🎁', '👶', '🐾', '🚗', '📱', '☕',
];

export const GOAL_ICONS = ['🎯', '💻', '📱', '🏍️', '🚗', '🏠', '✈️', '💍', '🎓', '🛟'];

type PocketSeed = [name: string, icon: string, color: string, extra?: Partial<Pocket>];

const DEFAULT_POCKETS: PocketSeed[] = [
  ['Kebutuhan', '🏠', '#0F766E'],
  ['Makanan', '🍜', '#EA580C'],
  ['Transportasi', '⛽', '#2563EB'],
  ['Tagihan', '💡', '#CA8A04'],
  ['Hiburan', '🎮', '#7C3AED'],
  ['Tabungan', '💰', '#16A34A', { isSavings: true }],
  ['Dana Darurat', '🛟', '#DC2626', { isSavings: true, isLocked: true }],
  ['Lainnya', '📦', '#475569'],
];

type CategorySeed = [name: string, icon: string, color: string];

const EXPENSE_CATEGORIES: CategorySeed[] = [
  ['Makanan', '🍜', '#EA580C'],
  ['Transportasi', '⛽', '#2563EB'],
  ['Kebutuhan Rumah', '🏠', '#0F766E'],
  ['Tagihan', '💡', '#CA8A04'],
  ['Belanja', '🛒', '#DB2777'],
  ['Hiburan', '🎮', '#7C3AED'],
  ['Kesehatan', '💊', '#DC2626'],
  ['Pendidikan', '📚', '#0891B2'],
  ['Pekerjaan', '💼', '#475569'],
  ['Teknologi', '💻', '#2563EB'],
  ['Perjalanan', '✈️', '#0891B2'],
  ['Hadiah', '🎁', '#DB2777'],
  ['Lainnya', '📦', '#475569'],
];

const INCOME_CATEGORIES: CategorySeed[] = [
  ['Gaji', '💵', '#16A34A'],
  ['Bonus', '🎉', '#CA8A04'],
  ['Freelance', '💼', '#2563EB'],
  ['Investasi', '📈', '#0F766E'],
  ['Hadiah', '🎁', '#DB2777'],
  ['Lainnya', '📦', '#475569'],
];

export function createDefaultData(newId: () => string, now: string): UserData {
  const pockets: Pocket[] = DEFAULT_POCKETS.map(([name, icon, color, extra]) => ({
    id: newId(),
    name,
    icon,
    color,
    budget: 0,
    isLocked: false,
    isSavings: false,
    archived: false,
    createdAt: now,
    ...extra,
  }));
  const seed = (type: CategoryType) => ([name, icon, color]: CategorySeed): Category => ({
    id: newId(),
    name,
    type,
    icon,
    color,
  });
  return {
    pockets,
    categories: [
      ...EXPENSE_CATEGORIES.map(seed('EXPENSE')),
      ...INCOME_CATEGORIES.map(seed('INCOME')),
    ],
    transactions: [],
    transfers: [],
    goals: [],
  };
}
