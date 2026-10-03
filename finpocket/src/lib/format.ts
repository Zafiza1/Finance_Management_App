const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function formatNumber(n: number): string {
  const s = Math.round(Math.abs(n)).toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatRp(n: number): string {
  return (n < 0 ? '-Rp' : 'Rp') + formatNumber(n);
}

/** Strips everything except digits. "Rp25.000" -> 25000 */
export function parseAmount(text: string): number {
  const digits = text.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

export function formatPct(p: number): string {
  const rounded = Math.round(p * 100) / 100;
  return `${rounded.toString().replace('.', ',')}%`;
}

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function addMonths(iso: string, months: number): string {
  const d = parseISODate(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  d.setDate(Math.min(day, daysInMonth(d.getFullYear(), d.getMonth())));
  return toISODate(d);
}

/** month is 0-based */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function formatDate(iso: string): string {
  const d = parseISODate(iso);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDayHeader(iso: string): string {
  const today = todayISO();
  if (iso === today) return 'Hari ini';
  if (iso === addDays(today, -1)) return 'Kemarin';
  const d = parseISODate(iso);
  return `${DAYS[d.getDay()]}, ${formatDate(iso)}`;
}

/** month is 0-based */
export function monthLabel(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`;
}
