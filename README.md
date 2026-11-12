# LabTrack - Laboratory Inventory & Borrowing Management System

Aplikasi web untuk mengelola inventaris peralatan laboratorium komputer, pencatatan peminjaman, pengembalian stok otomatis, dan pengelolaan akun petugas (Admin & Staff).

## Teknologi yang Digunakan
- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4 (dengan tema Terang & Gelap fungsional)
- **Basis Data Hosting Online**: Supabase (PostgreSQL + RPC transaksi atomik)
- **Autentikasi & Otorisasi**: Cookie HTTP-only bertanda tangan HMAC-SHA256 + hash kata sandi `scrypt` per-pengguna

## Akun Demo Pengujian
| Role | Username | Password | Hak Akses |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Dashboard penuh, tambah/edit/hapus barang, peminjaman, pengembalian, manajemen akun Staff |
| **Staff** | `staff` | `staff123` | Dashboard operasional, lihat & cari status barang, catat peminjaman, proses pengembalian, riwayat operasional |

## Data Awal Barang Wajib + Tambahan Lab
Skema awal menyertakan 5 barang wajib (`BR001` Laptop Lenovo, `BR002` Mouse Logitech, `BR003` Keyboard Mechanical, `BR004` Proyektor Epson, `BR005` Monitor LG) ditambah perangkat jaringan & aksesori laboratorium (`BR006` s.d. `BR012`).

## Menjalankan Secara Lokal
1. Pasang dependensi:
   ```bash
   npm install
   ```
2. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```
3. Buka `http://localhost:3000`. Tanpa konfigurasi `.env.local`, aplikasi berjalan di **Mode Pratinjau Lokal** dengan penyimpanan berkas JSON persisten di `.local-data/labtrack.json`.

## Panduan Menghubungkan Supabase & Hosting Publik (Vercel)
Untuk memenuhi ketentuan hosting publik agar data persisten di internet:

1. **Siapkan Proyek Supabase**:
   - Buat proyek baru di [supabase.com](https://supabase.com).
   - Buka menu **SQL Editor** dan jalankan seluruh isi berkas `supabase/schema.sql`.
   - Salin `Project URL`, `anon key`, dan `service_role key` dari **Project Settings -> API**.
2. **Uji dengan Supabase Secara Lokal (Opsional)**:
   - Salin `.env.example` menjadi `.env.local` dan isi variabel berikut:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `AUTH_SESSION_SECRET` (string acak minimal 32 karakter)
3. **Deploy ke Vercel**:
   - Unggah proyek ini ke repositori GitHub.
   - Impor repositori ke [vercel.com](https://vercel.com).
   - Masukkan ke-4 Environment Variables di atas di dashboard Vercel.
   - Klik **Deploy**. Setelah selesai, aplikasi dapat diakses publik melalui URL Vercel dan seluruh login, CRUD barang, peminjaman, pengembalian, dan manajemen Staff tersimpan permanen di Supabase PostgreSQL.

