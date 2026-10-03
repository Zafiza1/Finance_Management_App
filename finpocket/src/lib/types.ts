export type TxType = 'INCOME' | 'EXPENSE' | 'ALLOCATION';
export type CategoryType = 'INCOME' | 'EXPENSE';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export interface Pocket {
  id: string;
  name: string;
  icon: string;
  color: string;
  /** Monthly spending budget. 0 means no budget. */
  budget: number;
  isLocked: boolean;
  /** Savings pockets are excluded from the daily spending limit. */
  isSavings: boolean;
  archived: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
}

/**
 * INCOME adds money to the unallocated balance (pocketId null).
 * ALLOCATION moves money from the unallocated balance into a pocket.
 * EXPENSE removes money from a pocket.
 */
export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  pocketId: string | null;
  categoryId: string | null;
  /** Local date, YYYY-MM-DD */
  date: string;
  note: string;
  createdAt: string;
}

export interface Transfer {
  id: string;
  fromPocketId: string;
  toPocketId: string;
  amount: number;
  date: string;
  note: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  name: string;
  icon: string;
  targetAmount: number;
  /** Used only when the goal is not linked to a pocket. */
  currentAmount: number;
  targetDate: string | null;
  pocketId: string | null;
  createdAt: string;
}

export interface UserData {
  pockets: Pocket[];
  categories: Category[];
  transactions: Transaction[];
  transfers: Transfer[];
  goals: Goal[];
}
