import type { BudgetLevel } from './finance';

export const colors = {
  primary: '#0F766E',
  primaryDark: '#115E59',
  primarySoft: '#CCFBF1',
  bg: '#F4F6F8',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  income: '#16A34A',
  expense: '#DC2626',
  transfer: '#2563EB',
  allocation: '#7C3AED',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  dangerSoft: '#FEE2E2',
};

export const budgetColors: Record<BudgetLevel, string> = {
  safe: '#16A34A',
  watch: '#CA8A04',
  near: '#EA580C',
  done: '#DC2626',
  over: '#991B1B',
};

export const radius = 16;
