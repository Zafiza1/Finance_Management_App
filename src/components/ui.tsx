import { useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import {
  daysInMonth,
  formatDate,
  formatNumber,
  monthLabel,
  parseAmount,
  parseISODate,
  todayISO,
  toISODate,
} from '@/lib/format';
import { makeStyles, radius, useColors } from '@/lib/theme';

export function Screen({
  children,
  scroll = true,
  edges = [],
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const styles = useUiStyles();
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.screenContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.screenContent, { flex: 1 }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const styles = useUiStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const styles = useUiStyles();
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const styles = useUiStyles();
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const styles = useUiStyles();
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <Pressable onPress={onAction} hitSlop={10}>
          <Text style={styles.link}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useUiStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        (pressed || disabled) && { opacity: 0.6 },
        style,
      ]}
    >
      <Text style={[styles.buttonText, styles[`buttonText_${variant}`]]}>{title}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoFocus,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  autoFocus?: boolean;
}) {
  const styles = useUiStyles();
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoFocus={autoFocus}
      />
    </View>
  );
}

/** Rupiah input that formats thousands while typing. */
export function AmountField({
  label,
  value,
  onChange,
  autoFocus,
  large,
}: {
  label?: string;
  value: number;
  onChange: (n: number) => void;
  autoFocus?: boolean;
  large?: boolean;
}) {
  const styles = useUiStyles();
  const colors = useColors();
  return (
    <View style={styles.field}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.amountBox, large && styles.amountBoxLarge]}>
        <Text style={[styles.amountPrefix, large && styles.amountTextLarge]}>Rp</Text>
        <TextInput
          style={[styles.amountInput, large && styles.amountTextLarge]}
          value={value ? formatNumber(value) : ''}
          onChangeText={(t) => onChange(parseAmount(t))}
          placeholder="0"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          autoFocus={autoFocus}
        />
      </View>
    </View>
  );
}

export function ProgressBar({ pct, color }: { pct: number; color?: string }) {
  const styles = useUiStyles();
  const colors = useColors();
  const width = `${Math.max(0, Math.min(100, pct))}%` as const;
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width, backgroundColor: color ?? colors.primary }]} />
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  color?: string;
}) {
  const styles = useUiStyles();
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: color ?? colors.primary, borderColor: color ?? colors.primary }]}
    >
      <Text style={[styles.chipText, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  const styles = useUiStyles();
  return <View style={styles.chipRow}>{children}</View>;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; color?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const styles = useUiStyles();
  const colors = useColors();
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && { backgroundColor: o.color ?? colors.primary }]}
          >
            <Text style={[styles.segmentText, active && { color: '#fff' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

/** Date field that opens a month calendar. Values are local ISO dates (YYYY-MM-DD). */
export function DatePicker({
  label,
  value,
  onChange,
  minDate,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  minDate?: string;
}) {
  const styles = useUiStyles();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={({ pressed }) => [styles.dateField, pressed && { opacity: 0.7 }]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDate(value)}`}
      >
        <Text style={styles.dateFieldIcon}>📅</Text>
        <Text style={styles.dateText}>{formatDate(value)}</Text>
        {value === todayISO() && <Text style={styles.dateHint}>Hari ini</Text>}
      </Pressable>
      {open && (
        <CalendarModal
          value={value}
          minDate={minDate}
          onClose={() => setOpen(false)}
          onSelect={(iso) => {
            onChange(iso);
            setOpen(false);
          }}
        />
      )}
    </View>
  );
}

/** Mounted only while open, so it always starts on the month of the current value. */
function CalendarModal({
  value,
  minDate,
  onClose,
  onSelect,
}: {
  value: string;
  minDate?: string;
  onClose: () => void;
  onSelect: (iso: string) => void;
}) {
  const styles = useUiStyles();
  const colors = useColors();
  const [cursor, setCursor] = useState(() => monthStart(value));

  const { year, month } = cursor;
  const today = todayISO();
  const offset = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const shift = (months: number) => {
    const d = new Date(year, month + months, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  const nav = (text: string, months: number, a11y: string) => (
    <Pressable style={styles.calNav} onPress={() => shift(months)} hitSlop={6} accessibilityLabel={a11y}>
      <Text style={styles.calNavText}>{text}</Text>
    </Pressable>
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.calBackdrop} onPress={onClose}>
        {/* Inner Pressable swallows taps so only the backdrop closes the calendar. */}
        <Pressable style={styles.calSheet} onPress={() => {}}>
          <View style={styles.calHeader}>
            {nav('«', -12, 'Tahun sebelumnya')}
            {nav('‹', -1, 'Bulan sebelumnya')}
            <Text style={styles.calTitle}>{monthLabel(year, month)}</Text>
            {nav('›', 1, 'Bulan berikutnya')}
            {nav('»', 12, 'Tahun berikutnya')}
          </View>

          <View style={styles.calRow}>
            {WEEKDAYS.map((d) => (
              <Text key={d} style={styles.calWeekday}>
                {d}
              </Text>
            ))}
          </View>

          {Array.from({ length: cells.length / 7 }, (_, w) => (
            <View key={w} style={styles.calRow}>
              {cells.slice(w * 7, w * 7 + 7).map((day, i) => {
                if (!day) return <View key={i} style={styles.calCell} />;
                const iso = toISODate(new Date(year, month, day));
                const selected = iso === value;
                const disabled = !!minDate && iso < minDate;
                return (
                  <Pressable
                    key={i}
                    style={styles.calCell}
                    disabled={disabled}
                    onPress={() => onSelect(iso)}
                    accessibilityLabel={formatDate(iso)}
                  >
                    <View
                      style={[
                        styles.calDay,
                        iso === today && { borderColor: colors.primary },
                        selected && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.calDayText,
                          selected && { color: '#fff', fontWeight: '700' },
                          disabled && { color: colors.border },
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={styles.calFooter}>
            <Button
              title="Hari ini"
              variant="secondary"
              disabled={!!minDate && today < minDate}
              onPress={() => onSelect(today)}
              style={{ flex: 1 }}
            />
            <Button title="Batal" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function monthStart(iso: string) {
  const d = parseISODate(iso);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function ListRow({
  icon,
  title,
  subtitle,
  right,
  onPress,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
}) {
  const styles = useUiStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.listRow, pressed && { opacity: 0.6 }]}
    >
      {icon && <Text style={styles.listIcon}>{icon}</Text>}
      <View style={{ flex: 1 }}>
        <Text style={styles.listTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.muted} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

export function Empty({ text }: { text: string }) {
  const styles = useUiStyles();
  return <Text style={[styles.muted, { textAlign: 'center', paddingVertical: 20 }]}>{text}</Text>;
}

export function Banner({
  text,
  tone = 'warning',
  onPress,
}: {
  text: string;
  tone?: 'warning' | 'danger' | 'info';
  onPress?: () => void;
}) {
  const styles = useUiStyles();
  const colors = useColors();
  const bg = tone === 'danger' ? colors.dangerSoft : tone === 'info' ? colors.primarySoft : colors.warningSoft;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.banner, { backgroundColor: bg }]}>
      <Text style={styles.bannerText}>{text}</Text>
    </Pressable>
  );
}

export const useUiStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenContent: { padding: 16, paddingBottom: 40, gap: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius,
    padding: 16,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.muted, letterSpacing: 1, textTransform: 'uppercase' },
  link: { color: colors.primary, fontWeight: '600' },
  button: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
  button_primary: { backgroundColor: colors.primary },
  button_secondary: { backgroundColor: colors.primarySoft },
  button_danger: { backgroundColor: colors.dangerSoft },
  button_ghost: { backgroundColor: 'transparent' },
  buttonText: { fontSize: 16, fontWeight: '700' },
  buttonText_primary: { color: '#fff' },
  buttonText_secondary: { color: colors.primaryDark },
  buttonText_danger: { color: colors.expense },
  buttonText_ghost: { color: colors.primary },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  amountBoxLarge: { paddingVertical: 8 },
  amountPrefix: { fontSize: 16, fontWeight: '700', color: colors.muted, marginRight: 6 },
  amountInput: { flex: 1, fontSize: 16, paddingVertical: 12, color: colors.text, fontWeight: '600' },
  amountTextLarge: { fontSize: 32, fontWeight: '800' },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  segmented: { flexDirection: 'row', backgroundColor: colors.border, borderRadius: 12, padding: 4 },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  segmentText: { fontWeight: '700', color: colors.muted },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateFieldIcon: { fontSize: 18 },
  dateText: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  dateHint: { fontSize: 12, color: colors.muted },
  calBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 },
  calSheet: {
    backgroundColor: colors.card,
    borderRadius: radius,
    padding: 12,
    gap: 4,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  calHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  calNav: { paddingHorizontal: 10, paddingVertical: 6 },
  calNavText: { fontSize: 22, color: colors.primary, fontWeight: '700' },
  calTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.text },
  calRow: { flexDirection: 'row' },
  calWeekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: colors.muted, paddingVertical: 4 },
  calCell: { flex: 1, aspectRatio: 1, padding: 2 },
  calDay: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  calDayText: { fontSize: 15, color: colors.text },
  calFooter: { flexDirection: 'row', gap: 8, marginTop: 6 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  listIcon: { fontSize: 24, width: 36, textAlign: 'center' },
  listTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  banner: { borderRadius: 12, padding: 12 },
  bannerText: { color: colors.text, fontWeight: '600' },
}));
