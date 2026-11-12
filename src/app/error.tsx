"use client";

import Link from "next/link";
import { IconAlert } from "@/components/icons";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl items-center px-4 py-12">
      <section
        className="w-full rounded-[8px] border p-6 space-y-4"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div
          className="inline-flex h-11 w-11 items-center justify-center rounded-[6px]"
          style={{
            backgroundColor: "var(--status-err-bg)",
            color: "var(--status-err-fg)",
          }}
        >
          <IconAlert width={20} height={20} />
        </div>
        <h1 className="text-xl font-bold">Terjadi Gangguan Saat Memuat Halaman</h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {error.message || "Sistem gagal memuat data dari server. Periksa koneksi atau konfigurasi basis data Anda."}
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-[44px] items-center justify-center rounded-[6px] px-4 text-sm font-semibold"
            style={{
              backgroundColor: "var(--accent-primary)",
              color: "var(--accent-fg)",
            }}
          >
            Muat Ulang Halaman
          </button>
          <Link
            href="/login"
            className="inline-flex min-h-[44px] items-center justify-center rounded-[6px] border px-4 text-sm font-semibold"
            style={{
              borderColor: "var(--border-control)",
              backgroundColor: "var(--bg-surface)",
              color: "var(--text-primary)",
            }}
          >
            Ke Halaman Login
          </Link>
        </div>
      </section>
    </main>
  );
}

