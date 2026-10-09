import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createDefaultData } from './defaults';
import { applyRecurring, computeBalances, occurrenceDate, validateData } from './finance';
import { todayISO } from './format';
import { deletePhoto } from './photo';
import type { Category, FoodAnalysis, Goal, Pocket, RecurringRule, Settings, Transaction, User, UserData } from './types';

const newId = () => Crypto.randomUUID();
const nowISO = () => new Date().toISOString();

async function hashPassword(password: string, salt: string): Promise<string> {
  let hash = `${salt}:${password}`;
  for (let i = 0; i < 100; i++) {
    hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}${hash}`);
  }
  return hash;
}

const EMPTY_DATA: UserData = {
  pockets: [],
  categories: [],
  transactions: [],
  transfers: [],
  goals: [],
  recurring: [],
};

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  dailyReminder: false,
  reminderTime: 20 * 60,
  budgetAlerts: false,
  recurringAlerts: false,
  geminiApiKey: '',
};

/** Checks the shape of imported backup data and fills fields added in later versions. */
function normalizeData(raw: unknown): UserData | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Partial<UserData>;
  const keys = ['pockets', 'categories', 'transactions', 'transfers', 'goals'] as const;
  if (!keys.every((k) => Array.isArray(d[k]))) return null;
  return { ...(d as UserData), recurring: Array.isArray(d.recurring) ? d.recurring : [] };
}

/** null on success, otherwise a user-facing error message. */
export type Result = string | null;

interface NewEntry {
  amount: number;
  date: string;
  note: string;
}

export interface RecurringSummary {
  created: number;
  blocked: RecurringRule[];
}

interface State {
  hydrated: boolean;
  users: User[];
  sessionUserId: string | null;
  data: Record<string, UserData>;
  settings: Settings;

  setSettings(patch: Partial<Settings>): void;

  register(name: string, email: string, password: string): Promise<Result>;
  login(email: string, password: string): Promise<Result>;
  logout(): void;
  updateProfile(name: string): Result;

  addIncome(e: NewEntry & { categoryId: string | null }): Result;
  addExpense(
    e: NewEntry & { pocketId: string; categoryId: string | null; photoUri?: string; food?: FoodAnalysis },
  ): Result;
  addTransfer(e: NewEntry & { fromPocketId: string; toPocketId: string }): Result;
  allocate(allocations: { pocketId: string; amount: number }[], date: string): Result;
  deleteTransaction(id: string): Result;
  deleteTransfer(id: string): Result;

  savePocket(p: Omit<Pocket, 'id' | 'createdAt' | 'archived'> & { id?: string }): Result;
  setPocketArchived(id: string, archived: boolean): Result;
  deletePocket(id: string): Result;

  saveCategory(c: Omit<Category, 'id'> & { id?: string }): Result;
  deleteCategory(id: string): Result;

  saveGoal(g: Omit<Goal, 'id' | 'createdAt'> & { id?: string }): Result;
  addGoalFunds(id: string, amount: number): Result;
  deleteGoal(id: string): Result;

  saveRecurring(r: Omit<RecurringRule, 'id' | 'createdAt' | 'occurrences'> & { id?: string }): Result;
  setRecurringActive(id: string, active: boolean): Result;
  deleteRecurring(id: string): Result;
  /** Records all due recurring transactions for the signed-in user. */
  runRecurring(): RecurringSummary;

  /** Replaces the signed-in user's data with a JSON backup. */
  restoreBackup(json: string): Result;
}

export const useStore = create<State>()(
  persist(
    (set, get) => {
      /**
       * Applies a change to the signed-in user's data. The change is rejected
       * if it would leave any balance negative, so money is always traceable.
       */
      const mutate = (fn: (d: UserData) => UserData): Result => {
        const { sessionUserId, data } = get();
        if (!sessionUserId) return 'Silakan masuk terlebih dahulu.';
        const next = fn(data[sessionUserId] ?? EMPTY_DATA);
        const error = validateData(next);
        if (error) return error;
        set({ data: { ...data, [sessionUserId]: next } });
        return null;
      };

      const tx = (t: Omit<Transaction, 'id' | 'createdAt'>): Transaction => ({
        ...t,
        id: newId(),
        createdAt: nowISO(),
      });

      const positive = (amount: number): Result =>
        amount > 0 && Number.isFinite(amount) ? null : 'Nominal harus lebih dari 0.';

      return {
        hydrated: false,
        users: [],
        sessionUserId: null,
        data: {},
        settings: DEFAULT_SETTINGS,

        setSettings(patch) {
          set((s) => ({ settings: { ...s.settings, ...patch } }));
        },

        async register(name, email, password) {
          const cleanEmail = email.trim().toLowerCase();
          if (!name.trim()) return 'Nama wajib diisi.';
          if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return 'Format email tidak valid.';
          if (password.length < 6) return 'Password minimal 6 karakter.';
          if (get().users.some((u) => u.email === cleanEmail)) return 'Email sudah terdaftar.';
          const salt = newId();
          const user: User = {
            id: newId(),
            name: name.trim(),
            email: cleanEmail,
            salt,
            passwordHash: await hashPassword(password, salt),
            createdAt: nowISO(),
          };
          set((s) => ({
            users: [...s.users, user],
            data: { ...s.data, [user.id]: createDefaultData(newId, user.createdAt) },
            sessionUserId: user.id,
          }));
          return null;
        },

        async login(email, password) {
          const user = get().users.find((u) => u.email === email.trim().toLowerCase());
          if (!user || (await hashPassword(password, user.salt)) !== user.passwordHash) {
            return 'Email atau password salah.';
          }
          set({ sessionUserId: user.id });
          return null;
        },

        logout() {
          set({ sessionUserId: null });
        },

        updateProfile(name) {
          if (!name.trim()) return 'Nama wajib diisi.';
          const id = get().sessionUserId;
          set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, name: name.trim() } : u)) }));
          return null;
        },

        addIncome({ amount, categoryId, date, note }) {
          return (
            positive(amount) ??
            mutate((d) => ({
              ...d,
              transactions: [
                ...d.transactions,
                tx({ type: 'INCOME', amount, pocketId: null, categoryId, date, note }),
              ],
            }))
          );
        },

        addExpense({ amount, pocketId, categoryId, date, note, photoUri, food }) {
          const err = positive(amount) ?? mutate((d) => ({
            ...d,
            transactions: [
              ...d.transactions,
              tx({ type: 'EXPENSE', amount, pocketId, categoryId, date, note, photoUri, food }),
            ],
          }));
          return err && err.startsWith('Saldo Pocket') ? 'Saldo Pocket tidak mencukupi.' : err;
        },

        addTransfer({ amount, fromPocketId, toPocketId, date, note }) {
          if (fromPocketId === toPocketId) return 'Pocket asal dan tujuan harus berbeda.';
          const err = positive(amount) ?? mutate((d) => ({
            ...d,
            transfers: [
              ...d.transfers,
              { id: newId(), fromPocketId, toPocketId, amount, date, note, createdAt: nowISO() },
            ],
          }));
          return err && err.startsWith('Saldo Pocket') ? 'Saldo Pocket asal tidak mencukupi.' : err;
        },

        allocate(allocations, date) {
          const items = allocations.filter((a) => a.amount > 0);
          if (items.length === 0) return 'Isi nominal untuk minimal satu Pocket.';
          return mutate((d) => ({
            ...d,
            transactions: [
              ...d.transactions,
              ...items.map((a) =>
                tx({ type: 'ALLOCATION', amount: a.amount, pocketId: a.pocketId, categoryId: null, date, note: '' }),
              ),
            ],
          }));
        },

        deleteTransaction(id) {
          const { sessionUserId, data } = get();
          const photoUri = sessionUserId ? data[sessionUserId]?.transactions.find((t) => t.id === id)?.photoUri : undefined;
          const err = mutate((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }));
          if (!err) deletePhoto(photoUri);
          return err && `Transaksi tidak dapat dihapus. ${err}`;
        },

        deleteTransfer(id) {
          const err = mutate((d) => ({ ...d, transfers: d.transfers.filter((t) => t.id !== id) }));
          return err && `Transfer tidak dapat dihapus. ${err}`;
        },

        savePocket({ id, ...fields }) {
          if (!fields.name.trim()) return 'Nama Pocket wajib diisi.';
          if (fields.budget < 0) return 'Budget tidak boleh negatif.';
          const name = fields.name.trim();
          const { sessionUserId, data } = get();
          const existing = sessionUserId ? data[sessionUserId]?.pockets ?? [] : [];
          if (existing.some((p) => p.id !== id && !p.archived && p.name.toLowerCase() === name.toLowerCase())) {
            return 'Pocket dengan nama ini sudah ada.';
          }
          return mutate((d) => {
            if (id) {
              return { ...d, pockets: d.pockets.map((p) => (p.id === id ? { ...p, ...fields, name } : p)) };
            }
            const pocket: Pocket = { ...fields, name, id: newId(), archived: false, createdAt: nowISO() };
            return { ...d, pockets: [...d.pockets, pocket] };
          });
        },

        setPocketArchived(id, archived) {
          const { sessionUserId, data } = get();
          const d = sessionUserId ? data[sessionUserId] : undefined;
          if (archived && d && computeBalances(d).pockets[id]?.balance) {
            return 'Pindahkan seluruh saldo Pocket ini terlebih dahulu.';
          }
          return mutate((d) => ({
            ...d,
            pockets: d.pockets.map((p) => (p.id === id ? { ...p, archived } : p)),
          }));
        },

        deletePocket(id) {
          const { sessionUserId, data } = get();
          const d = sessionUserId ? data[sessionUserId] : undefined;
          if (!d) return null;
          const used =
            d.transactions.some((t) => t.pocketId === id) ||
            d.transfers.some((t) => t.fromPocketId === id || t.toPocketId === id);
          if (used) return 'Pocket ini memiliki riwayat transaksi. Arsipkan saja agar riwayat tetap tercatat.';
          return mutate((d) => ({
            ...d,
            pockets: d.pockets.filter((p) => p.id !== id),
            goals: d.goals.map((g) => (g.pocketId === id ? { ...g, pocketId: null } : g)),
            recurring: d.recurring.map((r) => (r.pocketId === id ? { ...r, active: false } : r)),
          }));
        },

        saveCategory({ id, ...fields }) {
          if (!fields.name.trim()) return 'Nama kategori wajib diisi.';
          const name = fields.name.trim();
          return mutate((d) => ({
            ...d,
            categories: id
              ? d.categories.map((c) => (c.id === id ? { ...c, ...fields, name } : c))
              : [...d.categories, { ...fields, name, id: newId() }],
          }));
        },

        deleteCategory(id) {
          return mutate((d) => ({ ...d, categories: d.categories.filter((c) => c.id !== id) }));
        },

        saveGoal({ id, ...fields }) {
          if (!fields.name.trim()) return 'Nama target wajib diisi.';
          if (fields.targetAmount <= 0) return 'Target nominal harus lebih dari 0.';
          const name = fields.name.trim();
          return mutate((d) => ({
            ...d,
            goals: id
              ? d.goals.map((g) => (g.id === id ? { ...g, ...fields, name } : g))
              : [...d.goals, { ...fields, name, id: newId(), createdAt: nowISO() }],
          }));
        },

        addGoalFunds(id, amount) {
          return (
            positive(amount) ??
            mutate((d) => ({
              ...d,
              goals: d.goals.map((g) => (g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g)),
            }))
          );
        },

        deleteGoal(id) {
          return mutate((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) }));
        },

        saveRecurring({ id, ...fields }) {
          const err = positive(fields.amount);
          if (err) return err;
          if (fields.type === 'EXPENSE' && !fields.pocketId) return 'Pilih Pocket untuk pengeluaran berulang.';
          if (fields.endDate && fields.endDate < fields.startDate) return 'Tanggal berakhir harus setelah tanggal mulai.';
          const rule = { ...fields, note: fields.note.trim(), pocketId: fields.type === 'EXPENSE' ? fields.pocketId : null };
          return mutate((d) => {
            if (!id) {
              return {
                ...d,
                recurring: [...d.recurring, { ...rule, id: newId(), occurrences: 0, createdAt: nowISO() }],
              };
            }
            return {
              ...d,
              recurring: d.recurring.map((r) => {
                if (r.id !== id) return r;
                if (r.startDate === rule.startDate && r.frequency === rule.frequency) return { ...r, ...rule };
                // New schedule: continue after the last date this rule already recorded, never repeat it.
                const last = d.transactions
                  .filter((t) => t.recurringId === id)
                  .reduce((max, t) => (t.date > max ? t.date : max), '');
                let occurrences = 0;
                while (last && occurrences < 10_000 && occurrenceDate(rule, occurrences) <= last) occurrences++;
                return { ...r, ...rule, occurrences };
              }),
            };
          });
        },

        setRecurringActive(id, active) {
          return mutate((d) => ({
            ...d,
            recurring: d.recurring.map((r) => (r.id === id ? { ...r, active } : r)),
          }));
        },

        deleteRecurring(id) {
          return mutate((d) => ({ ...d, recurring: d.recurring.filter((r) => r.id !== id) }));
        },

        runRecurring() {
          const { sessionUserId, data } = get();
          const current = sessionUserId ? data[sessionUserId] : undefined;
          if (!sessionUserId || !current || current.recurring.length === 0) return { created: 0, blocked: [] };
          const run = applyRecurring(current, todayISO(), tx);
          if (run.created > 0) set({ data: { ...data, [sessionUserId]: run.data } });
          return { created: run.created, blocked: run.blocked };
        },

        restoreBackup(json) {
          let parsed: unknown;
          try {
            parsed = JSON.parse(json);
          } catch {
            return 'File bukan backup FinPocket yang valid.';
          }
          const wrapper = parsed as { app?: string; data?: unknown };
          const restored = normalizeData(wrapper?.app === 'FinPocket' ? wrapper.data : parsed);
          if (!restored) return 'File bukan backup FinPocket yang valid.';
          const err = mutate(() => restored);
          return err && `Backup tidak dapat dipulihkan. ${err}`;
        },
      };
    },
    {
      name: 'finpocket-store',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ users, sessionUserId, data, settings }) => ({ users, sessionUserId, data, settings }),
      migrate: (persisted, version) => {
        const state = persisted as Partial<State>;
        if (version < 2) {
          const data: Record<string, UserData> = {};
          for (const [id, d] of Object.entries(state.data ?? {})) data[id] = { ...d, recurring: d.recurring ?? [] };
          return { ...state, data, settings: DEFAULT_SETTINGS } as State;
        }
        return state as State;
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...p.settings } };
      },
      onRehydrateStorage: () => () => useStore.setState({ hydrated: true }),
    },
  ),
);

export function useData(): UserData {
  return useStore((s) => (s.sessionUserId ? s.data[s.sessionUserId] : undefined) ?? EMPTY_DATA);
}

export function useCurrentUser(): User | undefined {
  return useStore((s) => s.users.find((u) => u.id === s.sessionUserId));
}

export function useBalances() {
  const data = useData();
  return useMemo(() => computeBalances(data), [data]);
}
