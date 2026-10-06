import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

import {
  computeBalances,
  expenseByCategory,
  pocketSpent,
  sumByType,
  type Period,
} from './finance';
import { formatDate, formatRp, todayISO } from './format';
import type { UserData } from './types';

/** null means "all time". */
export type ExportPeriod = (Period & { label: string }) | null;

interface Row {
  date: string;
  kind: string;
  description: string;
  category: string;
  pocket: string;
  income: number;
  expense: number;
  note: string;
}

const KIND_LABEL = { INCOME: 'Pemasukan', EXPENSE: 'Pengeluaran', ALLOCATION: 'Alokasi' } as const;

function buildRows(data: UserData, period: ExportPeriod): Row[] {
  const inRange = (d: string) => !period || (d >= period.start && d <= period.end);
  const pocketName = (id: string | null) => data.pockets.find((p) => p.id === id)?.name ?? (id ? 'Pocket terhapus' : '');
  const catName = (id: string | null) => data.categories.find((c) => c.id === id)?.name ?? '';

  const rows: (Row & { createdAt: string })[] = data.transactions
    .filter((t) => inRange(t.date))
    .map((t) => ({
      date: t.date,
      createdAt: t.createdAt,
      kind: KIND_LABEL[t.type] + (t.recurringId ? ' (berulang)' : ''),
      description:
        t.type === 'ALLOCATION' ? `Alokasi ke ${pocketName(t.pocketId)}` : t.note || catName(t.categoryId) || KIND_LABEL[t.type],
      category: catName(t.categoryId),
      pocket: t.type === 'INCOME' ? 'Belum dialokasikan' : pocketName(t.pocketId),
      income: t.type === 'INCOME' ? t.amount : 0,
      expense: t.type === 'EXPENSE' ? t.amount : 0,
      note: t.note,
    }));
  for (const tr of data.transfers.filter((x) => inRange(x.date))) {
    rows.push({
      date: tr.date,
      createdAt: tr.createdAt,
      kind: 'Transfer',
      description: `${pocketName(tr.fromPocketId)} → ${pocketName(tr.toPocketId)}`,
      category: '',
      pocket: `${pocketName(tr.fromPocketId)} → ${pocketName(tr.toPocketId)}`,
      income: 0,
      expense: 0,
      note: tr.note,
    });
  }
  return rows
    .sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)))
    .map(({ createdAt: _, ...r }) => r);
}

function summary(data: UserData, period: ExportPeriod) {
  const all: Period = { start: '0000-01-01', end: '9999-12-31' };
  const p = period ?? all;
  const income = sumByType(data, 'INCOME', p);
  const expense = sumByType(data, 'EXPENSE', p);
  const balances = computeBalances(data);
  const pockets = data.pockets
    .filter((x) => !x.archived)
    .map((x) => ({
      name: `${x.icon} ${x.name}`,
      balance: balances.pockets[x.id]?.balance ?? 0,
      budget: x.budget,
      spent: pocketSpent(data, x.id, p),
    }));
  return {
    income,
    expense,
    net: income - expense,
    totalBalance: balances.totalBalance,
    unallocated: balances.unallocated,
    pockets,
    categories: expenseByCategory(data, p),
  };
}

const safeName = (s: string) => s.replace(/[^\w-]+/g, '_');

function writeCacheFile(name: string, content: string, encoding: 'utf8' | 'base64'): File {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content, { encoding });
  return file;
}

async function share(file: File, mimeType: string, UTI: string, dialogTitle: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Fitur berbagi tidak tersedia di perangkat ini.');
  await Sharing.shareAsync(file.uri, { mimeType, UTI, dialogTitle });
}

export async function exportExcel(data: UserData, userName: string, period: ExportPeriod) {
  const label = period?.label ?? 'Semua waktu';
  const s = summary(data, period);
  const wb = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['Laporan Keuangan FinPocket'],
    ['Nama', userName],
    ['Periode', label],
    ['Dibuat', formatDate(todayISO())],
    [],
    ['Pemasukan', s.income],
    ['Pengeluaran', s.expense],
    ['Selisih', s.net],
    [],
    ['Total saldo saat ini', s.totalBalance],
    ['Belum dialokasikan', s.unallocated],
  ]);
  summarySheet['!cols'] = [{ wch: 24 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Ringkasan');

  const rows = buildRows(data, period);
  const txSheet = XLSX.utils.aoa_to_sheet([
    ['Tanggal', 'Jenis', 'Keterangan', 'Kategori', 'Pocket', 'Masuk', 'Keluar', 'Catatan'],
    ...rows.map((r) => [r.date, r.kind, r.description, r.category, r.pocket, r.income || null, r.expense || null, r.note]),
  ]);
  txSheet['!cols'] = [12, 22, 30, 18, 24, 14, 14, 30].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, txSheet, 'Transaksi');

  const pocketSheet = XLSX.utils.aoa_to_sheet([
    ['Pocket', 'Saldo saat ini', 'Budget bulanan', 'Pengeluaran periode ini'],
    ...s.pockets.map((p) => [p.name, p.balance, p.budget || null, p.spent]),
  ]);
  pocketSheet['!cols'] = [24, 16, 16, 22].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, pocketSheet, 'Pocket');

  const catSheet = XLSX.utils.aoa_to_sheet([
    ['Kategori', 'Pengeluaran', 'Persentase'],
    ...s.categories.map((c) => [c.name, c.amount, s.expense > 0 ? Math.round((c.amount / s.expense) * 1000) / 10 : 0]),
  ]);
  catSheet['!cols'] = [24, 16, 12].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, catSheet, 'Kategori');

  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) as string;
  const file = writeCacheFile(`FinPocket_${safeName(label)}_${todayISO()}.xlsx`, base64, 'base64');
  await share(
    file,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'org.openxmlformats.spreadsheetml.sheet',
    'Export Excel',
  );
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function exportPdf(data: UserData, userName: string, period: ExportPeriod) {
  const label = period?.label ?? 'Semua waktu';
  const s = summary(data, period);
  const rows = buildRows(data, period);
  const money = (n: number) => (n ? formatRp(n) : '');

  const html = `<!doctype html><html><head><meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #0F172A; padding: 24px; font-size: 11px; }
  h1 { color: #0F766E; margin: 0 0 4px; font-size: 22px; }
  h2 { font-size: 14px; margin: 20px 0 8px; color: #0F766E; }
  .muted { color: #64748B; }
  .stats { display: flex; gap: 8px; margin-top: 12px; }
  .stat { flex: 1; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px; }
  .stat b { display: block; font-size: 14px; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; background: #F1F5F9; padding: 6px; font-size: 10px; text-transform: uppercase; color: #475569; }
  td { padding: 5px 6px; border-bottom: 1px solid #E2E8F0; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .in { color: #16A34A; } .out { color: #DC2626; }
  tr { page-break-inside: avoid; }
</style></head><body>
  <h1>Laporan Keuangan FinPocket</h1>
  <div class="muted">${esc(userName)} · Periode: ${esc(label)} · Dibuat ${formatDate(todayISO())}</div>
  <div class="stats">
    <div class="stat">Pemasukan<b class="in">${formatRp(s.income)}</b></div>
    <div class="stat">Pengeluaran<b class="out">${formatRp(s.expense)}</b></div>
    <div class="stat">Selisih<b>${formatRp(s.net)}</b></div>
    <div class="stat">Total saldo<b>${formatRp(s.totalBalance)}</b></div>
  </div>

  <h2>Pocket</h2>
  <table><tr><th>Pocket</th><th class="num">Saldo</th><th class="num">Budget</th><th class="num">Pengeluaran periode</th></tr>
  ${s.pockets.map((p) => `<tr><td>${esc(p.name)}</td><td class="num">${formatRp(p.balance)}</td><td class="num">${money(p.budget) || '-'}</td><td class="num">${formatRp(p.spent)}</td></tr>`).join('')}
  <tr><td class="muted">Belum dialokasikan</td><td class="num">${formatRp(s.unallocated)}</td><td></td><td></td></tr>
  </table>

  <h2>Pengeluaran per Kategori</h2>
  ${s.categories.length === 0 ? '<div class="muted">Tidak ada pengeluaran.</div>' : `<table><tr><th>Kategori</th><th class="num">Nominal</th><th class="num">%</th></tr>
  ${s.categories.map((c) => `<tr><td>${esc(`${c.icon} ${c.name}`)}</td><td class="num">${formatRp(c.amount)}</td><td class="num">${s.expense > 0 ? Math.round((c.amount / s.expense) * 100) : 0}%</td></tr>`).join('')}</table>`}

  <h2>Riwayat Transaksi (${rows.length})</h2>
  ${rows.length === 0 ? '<div class="muted">Tidak ada transaksi.</div>' : `<table><tr><th>Tanggal</th><th>Jenis</th><th>Keterangan</th><th>Pocket</th><th class="num">Masuk</th><th class="num">Keluar</th></tr>
  ${rows.map((r) => `<tr><td>${formatDate(r.date)}</td><td>${esc(r.kind)}</td><td>${esc(r.description)}${r.category && r.description !== r.category ? `<div class="muted">${esc(r.category)}</div>` : ''}</td><td>${esc(r.pocket)}</td><td class="num in">${money(r.income)}</td><td class="num out">${money(r.expense)}</td></tr>`).join('')}</table>`}
</body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  const target = new File(Paths.cache, `FinPocket_${safeName(label)}_${todayISO()}.pdf`);
  if (target.exists) target.delete();
  const pdf = new File(uri);
  pdf.moveSync(target);
  await share(pdf, 'application/pdf', 'com.adobe.pdf', 'Export PDF');
}

export async function exportBackup(data: UserData) {
  const json = JSON.stringify({ app: 'FinPocket', version: 2, exportedAt: new Date().toISOString(), data }, null, 2);
  const file = writeCacheFile(`FinPocket_backup_${todayISO()}.json`, json, 'utf8');
  await share(file, 'application/json', 'public.json', 'Simpan Backup');
}

/** Lets the user pick a backup file. Returns its text, or null if cancelled. */
export async function pickBackupFile(): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets[0]) return null;
  return new File(res.assets[0].uri).text();
}
