import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { nextRecurringDate, pocketBudgetStatus, type BudgetLevel } from './finance';
import { formatRp, parseISODate, todayISO } from './format';
import { useStore } from './store';
import type { UserData } from './types';

/** All notifications are scheduled on the device itself; no push server is involved. */

const CHANNEL_ID = 'reminders';
const DAILY_ID = 'daily-reminder';
const RECURRING_PREFIX = 'recurring-';
const RECURRING_HOUR = 8;

const LEVEL_RANK: Record<BudgetLevel, number> = { safe: 0, watch: 1, near: 2, done: 3, over: 4 };

export async function hasPermission(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Asks for permission if needed. Returns false when the user declines. */
export async function ensurePermission(): Promise<boolean> {
  if (await hasPermission()) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Re-creates every scheduled notification from the current settings and data. */
export async function syncScheduledNotifications() {
  const { settings, sessionUserId, data } = useStore.getState();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier === DAILY_ID || n.identifier.startsWith(RECURRING_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!sessionUserId || !(await hasPermission())) return;

  if (settings.dailyReminder) {
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_ID,
      content: {
        title: 'Sudah catat keuangan hari ini? 📝',
        body: 'Luangkan 1 menit untuk mencatat pemasukan dan pengeluaranmu.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: Math.floor(settings.reminderTime / 60),
        minute: settings.reminderTime % 60,
        channelId: CHANNEL_ID,
      },
    });
  }

  const userData = data[sessionUserId];
  if (settings.recurringAlerts && userData) {
    const now = Date.now();
    for (const rule of userData.recurring) {
      const next = rule.active ? nextRecurringDate(rule) : null;
      if (!next) continue;
      const at = parseISODate(next);
      at.setHours(RECURRING_HOUR, 0, 0, 0);
      if (at.getTime() <= now) continue;
      const label = rule.note || (rule.type === 'INCOME' ? 'Pemasukan berulang' : 'Pengeluaran berulang');
      await Notifications.scheduleNotificationAsync({
        identifier: `${RECURRING_PREFIX}${rule.id}`,
        content: {
          title: `🔁 ${label} hari ini`,
          body: `${formatRp(rule.amount)} akan dicatat otomatis saat kamu membuka FinPocket.`,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_ID },
      });
    }
  }
}

function budgetLevels(d: UserData | undefined, today: string): Map<string, BudgetLevel> {
  const out = new Map<string, BudgetLevel>();
  for (const p of d?.pockets ?? []) {
    const st = p.archived ? null : pocketBudgetStatus(d!, p, today);
    if (st) out.set(p.id, st.level);
  }
  return out;
}

let started = false;

/**
 * Configures notifications once and keeps them in sync with the store:
 * reschedules reminders when settings or recurring rules change, and sends an
 * immediate alert when a pocket's budget crosses into "near", "done" or "over".
 */
export function startNotifications() {
  if (started || Platform.OS === 'web') return;
  started = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Pengingat FinPocket',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  void syncScheduledNotifications();

  let syncTimer: ReturnType<typeof setTimeout> | undefined;
  useStore.subscribe((state, prev) => {
    const uid = state.sessionUserId;
    const cur = uid ? state.data[uid] : undefined;
    const old = uid ? prev.data[uid] : undefined;

    if (
      state.settings !== prev.settings ||
      uid !== prev.sessionUserId ||
      cur?.recurring !== old?.recurring
    ) {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => void syncScheduledNotifications(), 500);
    }

    if (!state.settings.budgetAlerts || !uid || uid !== prev.sessionUserId || cur === old) return;
    const today = todayISO();
    const before = budgetLevels(old, today);
    const after = budgetLevels(cur, today);
    for (const [pocketId, level] of after) {
      const was = before.get(pocketId) ?? 'safe';
      if (LEVEL_RANK[level] < LEVEL_RANK.near || LEVEL_RANK[level] <= LEVEL_RANK[was]) continue;
      const pocket = cur!.pockets.find((p) => p.id === pocketId)!;
      const st = pocketBudgetStatus(cur!, pocket, today)!;
      void Notifications.scheduleNotificationAsync({
        content: {
          title: `${pocket.icon} Budget ${pocket.name}: ${st.label}`,
          body:
            st.message ??
            `Sudah terpakai ${Math.round(st.pct)}% (${formatRp(st.spent)} dari ${formatRp(st.budget)}).`,
        },
        trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
      });
    }
  });
}
