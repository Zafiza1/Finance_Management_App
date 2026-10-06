# FinPocket

> "Atur uangmu, tentukan ke mana perginya."

Aplikasi manajemen keuangan pribadi berbasis **Pocket** untuk **iOS dan Android** (React Native + Expo SDK 57, TypeScript, Expo Router).

## Install di HP (tanpa laptop, tanpa jaringan yang sama)

Expo Go butuh HP dan laptop di Wi-Fi yang sama. Supaya FinPocket bisa dipasang dan dipakai di mana saja,
build file **APK** mandiri lewat EAS (build berjalan di cloud Expo, gratis, tidak perlu Android Studio):

```bash
npx eas-cli@latest login                                  # sekali saja, buat akun gratis di expo.dev
npx eas-cli@latest build --platform android --profile preview
```

Setelah selesai (±10–20 menit), terminal menampilkan link + QR code. Buka link itu di HP, unduh `.apk`,
lalu pasang (izinkan "Install dari sumber tidak dikenal" jika diminta). Aplikasi berjalan sepenuhnya
offline — tidak perlu internet atau laptop setelah terpasang.

Profil build ada di `eas.json`:

| Profil | Hasil | Untuk |
| --- | --- | --- |
| `preview` | `.apk` | dipasang langsung di HP / dibagikan |
| `production` | `.aab` | upload ke Google Play Store |
| `development` | development build | pengembangan dengan dev server |

Untuk iOS, pemasangan di luar App Store butuh akun Apple Developer (`--platform ios`).

## Pengembangan

```bash
npm install
npx expo start
```

- **HP:** scan QR code dengan Expo Go (HP & laptop harus di jaringan yang sama — hanya untuk development).
- **Emulator Android:** tekan `a` di terminal (butuh Android Studio).

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
| Transaksi berulang (harian/mingguan/bulanan/tahunan), dicatat otomatis saat aplikasi dibuka | `src/app/(app)/recurring/` |
| Tema terang / gelap / ikut sistem | Settings |
| Notifikasi lokal: pengingat harian, peringatan budget, jatuh tempo transaksi berulang | `src/app/(app)/notifications.tsx` |
| Export laporan ke Excel (.xlsx) dan PDF, per bulan atau semua waktu | `src/app/(app)/export.tsx` |
| Backup ke file JSON dan pulihkan dari backup | `src/app/(app)/export.tsx` |

## Aturan perhitungan

Semua saldo **dihitung dari riwayat**, tidak pernah disimpan langsung (`src/lib/finance.ts`):

```
Saldo Pocket  = Alokasi + Transfer masuk - Transfer keluar - Pengeluaran
Total Saldo   = Total Pemasukan - Total Pengeluaran
              = Belum dialokasikan + SUM(Saldo semua Pocket)
```

Setiap perubahan data divalidasi (`validateData`). Perubahan yang membuat saldo Pocket atau saldo belum dialokasikan menjadi negatif akan ditolak, termasuk saat menghapus transaksi.

## Cek kualitas

```bash
npm run typecheck   # TypeScript
npx expo lint       # ESLint
npm test            # cek aturan perhitungan & transaksi berulang
```

## Catatan

- Data disimpan **lokal di perangkat** (AsyncStorage) per akun, tanpa server. Aplikasi berfungsi penuh tanpa internet.
- Karena tidak ada server, data **tidak tersinkron antar HP** dan **hilang jika aplikasi dihapus**. Gunakan
  *Pengaturan → Export & Backup → Simpan Backup* secara berkala, lalu *Pulihkan dari Backup* di HP baru.
- Transaksi berulang dicatat saat aplikasi dibuka (tanpa server tidak ada proses di latar belakang). Jadwal yang
  terlewat akan dicatat semua sekaligus; pengeluaran yang saldonya tidak cukup ditunda, bukan dilewati.
- Notifikasi butuh build APK (bukan Expo Go) dan izin notifikasi di HP.
