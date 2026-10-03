# FinPocket

> "Atur uangmu, tentukan ke mana perginya."

Aplikasi manajemen keuangan pribadi berbasis **Pocket** untuk **iOS dan Android** (React Native + Expo SDK 57, TypeScript, Expo Router).

## Menjalankan

```bash
npm install
npx expo start
```

- **HP (paling cepat):** install aplikasi **Expo Go** dari App Store / Play Store, lalu scan QR code yang muncul.
- **Emulator Android:** tekan `a` di terminal (butuh Android Studio).
- **Simulator iOS:** tekan `i` (butuh macOS + Xcode).

## Build untuk App Store / Play Store

Menggunakan EAS (build di cloud, tidak perlu Mac untuk iOS):

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android   # .aab / .apk
npx eas-cli@latest build --platform ios       # butuh akun Apple Developer
```

Bundle ID / package: `com.finpocket.app` (ubah di `app.json` sebelum rilis).

## Fitur MVP

| Fitur | Lokasi |
| --- | --- |
| Autentikasi (daftar / masuk, password di-hash) | `src/app/(auth)/login.tsx` |
| Dashboard: total saldo, pemasukan, pengeluaran, Pocket, batas harian, target, transaksi terbaru | `src/app/(app)/(tabs)/index.tsx` |
| Income / Expense / Transfer (quick add lewat tombol +) | `src/app/(app)/transaction/new.tsx` |
| Pembagian pemasukan ke Pocket, menolak alokasi yang melebihi saldo | `src/app/(app)/allocate.tsx` |
| Pocket kustom: icon, warna, budget, kunci, tabungan | `src/app/(app)/pocket/` |
| Locked Pocket dengan konfirmasi | detail Pocket dan form transaksi |
| Validasi saldo Pocket, termasuk opsi **Pindahkan Uang** | form transaksi |
| Kategori (tambah, edit, hapus) | `src/app/(app)/categories.tsx` |
| Budget bulanan dengan 5 level peringatan | `src/app/(app)/budgets.tsx` |
| Target tabungan (terhubung ke Pocket atau manual) | `src/app/(app)/(tabs)/goals.tsx` |
| Riwayat transaksi dengan filter | `src/app/(app)/history.tsx` |
| Laporan bulanan, insight, breakdown per kategori dan per Pocket | `src/app/(app)/(tabs)/reports.tsx` |
| Export data (JSON lewat share sheet) | Settings |

## Aturan perhitungan

Semua saldo **dihitung dari riwayat**, tidak pernah disimpan langsung (`src/lib/finance.ts`):

```
Saldo Pocket  = Alokasi + Transfer masuk - Transfer keluar - Pengeluaran
Total Saldo   = Total Pemasukan - Total Pengeluaran
              = Belum dialokasikan + SUM(Saldo semua Pocket)
```

Setiap perubahan data divalidasi (`validateData`). Perubahan yang membuat saldo Pocket atau saldo belum dialokasikan menjadi negatif akan ditolak, termasuk saat menghapus transaksi.

## Pengembangan

```bash
npm run typecheck   # TypeScript
npm test            # cek aturan perhitungan terhadap contoh di spesifikasi
```

## Catatan

- Data disimpan **lokal di perangkat** (AsyncStorage) per akun. Belum ada server atau cloud sync.
- Belum tersedia (pasca-MVP): transaksi berulang, grafik lanjutan, notifikasi, export Excel/PDF, multi-account, dan tema gelap.
