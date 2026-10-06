import { Appearance, StyleSheet, useColorScheme } from 'react-native';

import type { BudgetLevel } from './finance';

export const lightColors = {
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

export type ThemeColors = typeof lightColors;

export const darkColors: ThemeColors = {
  primary: '#0D9488',
  primaryDark: '#5EEAD4',
  primarySoft: '#134E4A',
  bg: '#0B1220',
  card: '#151E2E',
  text: '#E2E8F0',
  muted: '#94A3B8',
  border: '#263247',
  income: '#22C55E',
  expense: '#F87171',
  transfer: '#60A5FA',
  allocation: '#A78BFA',
  warning: '#F59E0B',
  warningSoft: '#3B2A0B',
  dangerSoft: '#3F1D1D',
};

export const budgetColors: Record<BudgetLevel, string> = {
  safe: '#16A34A',
  watch: '#CA8A04',
  near: '#EA580C',
  done: '#DC2626',
  over: '#B91C1C',
};

export const radius = 16;

export type ThemePref = 'system' | 'light' | 'dark';

/** Overrides the OS color scheme for the whole app, including native dialogs. */
export function applyThemePref(pref: ThemePref) {
  Appearance.setColorScheme(pref === 'system' ? 'unspecified' : pref);
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}

export function useColors(): ThemeColors {
  return useIsDark() ? darkColors : lightColors;
}

/**
 * Builds a light and a dark stylesheet once and returns a hook that picks the
 * one matching the active color scheme.
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(
  fn: (c: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  const light = StyleSheet.create(fn(lightColors));
  const dark = StyleSheet.create(fn(darkColors));
  return function useStyles() {
    return useIsDark() ? dark : light;
  };
}
