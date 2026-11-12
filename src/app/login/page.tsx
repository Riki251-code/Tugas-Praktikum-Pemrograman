import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/db";

export const metadata: Metadata = {
  title: "Masuk",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  const supabaseReady = isSupabaseConfigured();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span
            className="font-mono-code rounded-[4px] px-2 py-1 text-xs font-semibold uppercase tracking-wider"
            style={{
              backgroundColor: "var(--brand-primary)",
              color: "var(--brand-fg)",
            }}
          >
            LAB
          </span>
          <span className="text-base font-bold tracking-tight">LabTrack - Inventaris Lab</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-4 py-8 sm:px-6">
        <div className="grid w-full gap-8 lg:grid-cols-12 lg:items-start">
          <section className="space-y-5 lg:col-span-6 lg:pr-6">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Sistem Inventaris dan Peminjaman Laboratorium Komputer
            </h1>
            <p className="text-sm leading-relaxed sm:text-base" style={{ color: "var(--text-secondary)" }}>
              Catat stok perangkat laboratorium, pantau unit yang tersedia maupun sedang dipinjam, dan proses pengembalian secara terstruktur sesuai hak akses Admin atau Staff.
            </p>

            <div
              className="rounded-[8px] border p-4 space-y-3"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <h2 className="text-sm font-bold">Pembagian Akses Sistem</h2>
              <dl className="space-y-2 text-sm">
                <div className="border-b pb-2" style={{ borderColor: "var(--border-subtle)" }}>
                  <dt className="font-semibold">Admin (Pengelola Utama)</dt>
                  <dd className="mt-0.5 text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>
                    Mengelola data barang (tambah, ubah, hapus), seluruh transaksi peminjaman dan pengembalian, serta akun Staff.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">Staff (Petugas Operasional)</dt>
                  <dd className="mt-0.5 text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>
                    Melihat daftar dan status ketersediaan barang, mencatat peminjaman, memproses pengembalian, dan melihat riwayat transaksi operasional.
                  </dd>
                </div>
              </dl>
            </div>

            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {supabaseReady
                ? "Status basis data: Terhubung ke Supabase PostgreSQL."
                : "Status basis data: Mode pratinjau lokal (.local-data). Hubungkan variabel lingkungan Supabase saat publikasi online."}
            </p>
          </section>

          <section
            className="rounded-[8px] border p-5 sm:p-7 lg:col-span-6"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div className="mb-5 border-b pb-4" style={{ borderColor: "var(--border-subtle)" }}>
              <h2 className="text-lg font-bold">Masuk ke Ruang Kerja Lab</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                Gunakan username dan password akun lab Anda.
              </p>
            </div>
            <LoginForm />
          </section>
        </div>
      </main>
    </div>
  );
}

