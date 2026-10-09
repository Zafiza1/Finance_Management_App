import { Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { Card, ProgressBar, useUiStyles } from '@/components/ui';
import { DAILY_LIMITS, healthGrade, macroShares, type HealthGrade } from '@/lib/food';
import { formatNumber } from '@/lib/format';
import { makeStyles } from '@/lib/theme';
import type { FoodAnalysis } from '@/lib/types';

const MACRO_COLORS = { carbs: '#F59E0B', protein: '#3B82F6', fat: '#EF4444' };

const GRADE: Record<HealthGrade, { color: string; label: string }> = {
  A: { color: '#16A34A', label: 'Sehat' },
  B: { color: '#65A30D', label: 'Cukup sehat' },
  C: { color: '#EA580C', label: 'Sebaiknya dibatasi' },
  D: { color: '#DC2626', label: 'Harus dibatasi' },
};

const SPICY_LABEL = ['', 'Sedikit pedas', 'Pedas', 'Sangat pedas'];

/** Rounds to one decimal and uses the Indonesian decimal comma. */
const fmt = (n: number) => (n >= 100 ? formatNumber(n) : (Math.round(n * 10) / 10).toString().replace('.', ','));

export function FoodAnalysisCard({ food }: { food: FoodAnalysis }) {
  const s = useStyles();
  const ui = useUiStyles();
  const shares = macroShares(food);
  const grade = healthGrade(food.healthScore);

  const badges = [
    food.vegan ? '🟢 Vegan' : food.vegetarian ? '🟢 Vegetarian' : null,
    food.glutenFree ? '🌾 Bebas Gluten' : null,
    food.spicyLevel > 0 ? `${'🌶️'.repeat(food.spicyLevel)} ${SPICY_LABEL[food.spicyLevel]}` : null,
  ].filter((b): b is string => !!b);

  const risks = [
    { label: 'Natrium / Garam', value: food.sodiumMg, unit: 'mg', limit: DAILY_LIMITS.sodiumMg },
    { label: 'Gula', value: food.sugarG, unit: 'g', limit: DAILY_LIMITS.sugarG },
    { label: 'Lemak Jenuh', value: food.saturatedFatG, unit: 'g', limit: DAILY_LIMITS.saturatedFatG },
  ];

  return (
    <Card style={{ gap: 14 }}>
      {/* 1. Nama & estimasi berat */}
      <View style={s.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{food.name}</Text>
          <Text style={ui.muted}>
            {food.portion} / ±{formatNumber(food.weightGrams)} gram · {formatNumber(food.calories)} kkal
          </Text>
        </View>
        {/* 6. Skor kesehatan */}
        <View style={[s.grade, { backgroundColor: GRADE[grade].color }]}>
          <Text style={s.gradeLetter}>{grade}</Text>
          <Text style={s.gradeScore}>{food.healthScore}/100</Text>
        </View>
      </View>
      <Text style={[s.gradeNote, { color: GRADE[grade].color }]}>
        {GRADE[grade].label}
        {food.healthNote ? <Text style={ui.muted}> · {food.healthNote}</Text> : null}
      </Text>

      {/* 5. Badge diet */}
      {badges.length > 0 && (
        <View style={s.badgeRow}>
          {badges.map((b) => (
            <View key={b} style={s.badge}>
              <Text style={s.badgeText}>{b}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 2. Grafik makronutrisi */}
      <Text style={s.section}>Makronutrisi</Text>
      <View style={s.macroRow}>
        <MacroDonut shares={shares} calories={food.calories} />
        <View style={{ flex: 1, gap: 8 }}>
          <MacroLegend color={MACRO_COLORS.carbs} label="Karbohidrat" grams={food.carbsG} pct={shares.carbs} />
          <MacroLegend color={MACRO_COLORS.protein} label="Protein" grams={food.proteinG} pct={shares.protein} />
          <MacroLegend color={MACRO_COLORS.fat} label="Lemak" grams={food.fatG} pct={shares.fat} />
        </View>
      </View>

      {/* 3. % AKG zat berisiko */}
      <Text style={s.section}>Kebutuhan Harian (% AKG)</Text>
      <View style={{ gap: 10 }}>
        {risks.map((r) => {
          const pct = (r.value / r.limit) * 100;
          return (
            <View key={r.label} style={{ gap: 4 }}>
              <View style={s.riskHead}>
                <Text style={s.riskLabel}>{r.label}</Text>
                <Text style={[s.riskPct, { color: riskColor(pct) }]}>
                  {fmt(r.value)} {r.unit} · {Math.round(pct)}%
                </Text>
              </View>
              <ProgressBar pct={pct} color={riskColor(pct)} />
            </View>
          );
        })}
      </View>

      {/* 4. Vitamin & mineral */}
      {food.micros.length > 0 && (
        <>
          <Text style={s.section}>Vitamin & Mineral</Text>
          <View style={{ gap: 6 }}>
            {food.micros.map((m) => (
              <View key={m.name} style={s.microRow}>
                <Text style={s.microName}>• {m.name}</Text>
                <Text style={ui.muted}>
                  {m.amount} · {Math.round(m.akgPct)}% AKG
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={[ui.muted, { fontSize: 11 }]}>
        Estimasi AI dari foto, bukan pengukuran laboratorium. AKG mengacu orang dewasa (2150 kkal).
      </Text>
    </Card>
  );
}

/** Green while a single dish stays under a fifth of the daily limit, red past 40%. */
function riskColor(pct: number) {
  if (pct < 20) return '#16A34A';
  if (pct < 40) return '#D97706';
  return '#DC2626';
}

function MacroDonut({ shares, calories }: { shares: ReturnType<typeof macroShares>; calories: number }) {
  const s = useStyles();
  const size = 112;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const parts = [
    { key: 'carbs', pct: shares.carbs, color: MACRO_COLORS.carbs },
    { key: 'protein', pct: shares.protein, color: MACRO_COLORS.protein },
    { key: 'fat', pct: shares.fat, color: MACRO_COLORS.fat },
  ];
  let offset = 0;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke="#94A3B833" strokeWidth={stroke} fill="none" />
          {parts.map((p) => {
            const len = (p.pct / 100) * circumference;
            const el = (
              <Circle
                key={p.key}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={p.color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${len} ${circumference - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
        </G>
      </Svg>
      <View style={s.donutCenter} pointerEvents="none">
        <Text style={s.donutKcal}>{formatNumber(calories)}</Text>
        <Text style={s.donutUnit}>kkal</Text>
      </View>
    </View>
  );
}

function MacroLegend({ color, label, grams, pct }: { color: string; label: string; grams: number; pct: number }) {
  const s = useStyles();
  return (
    <View style={s.legendRow}>
      <View style={[s.legendDot, { backgroundColor: color }]} />
      <Text style={s.legendLabel}>{label}</Text>
      <Text style={s.legendValue}>
        {Math.round(pct)}% · {fmt(grams)} g
      </Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 20, fontWeight: '800', color: colors.text },
  grade: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  gradeLetter: { color: '#fff', fontSize: 26, fontWeight: '900', lineHeight: 30 },
  gradeScore: { color: '#fff', fontSize: 11, fontWeight: '700' },
  gradeNote: { fontSize: 13, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.primarySoft },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.text },
  section: { fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase' },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  donutCenter: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  donutKcal: { fontSize: 18, fontWeight: '800', color: colors.text },
  donutUnit: { fontSize: 11, color: colors.muted },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '600' },
  legendValue: { fontSize: 13, color: colors.muted },
  riskHead: { flexDirection: 'row', justifyContent: 'space-between' },
  riskLabel: { fontSize: 14, color: colors.text, fontWeight: '600' },
  riskPct: { fontSize: 13, fontWeight: '700' },
  microRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  microName: { fontSize: 14, color: colors.text, flexShrink: 1 },
}));
