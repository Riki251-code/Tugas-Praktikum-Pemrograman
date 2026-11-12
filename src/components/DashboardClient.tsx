"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatDateId, formatDateTimeId, getItemAvailabilityInfo } from "@/lib/format";
import { AppUser, DashboardSummary } from "@/lib/types";
import { IconAlert, IconBorrowOut, IconBox, IconReturnIn, IconUsers } from "./icons";
import { StatusBadge } from "./StatusBadge";

interface DashboardClientProps {
  user: AppUser;
  initialSummary: DashboardSummary;
}

export function DashboardClient({ user, initialSummary }: DashboardClientProps) {
  const [summary, setSummary] = useState<DashboardSummary>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Gagal memuat ringkasan dashboard.");
        return;
      }
      setSummary(data as DashboardSummary);
    } catch {
      setError("Koneksi terputus saat memperbarui ringkasan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSummary(initialSummary);
  }, [initialSummary]);

  const availablePct =
    summary.totalUnits > 0
      ? Math.round((summary.availableUnits / summary.totalUnits) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {user.role === "admin"
              ? "Dashboard Pengelolaan Lab"
              : "Dashboard Operasional Staff"}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {user.role === "admin"
              ? "Ringkasan ketersediaan inventaris, transaksi peminjaman aktif, dan aktivitas sistem."
              : "Pantau ketersediaan perangkat lab, catat peminjaman, dan proses pengembalian harian."}
          </p>
        </div>

        <button
          type="button"
          onClick={refreshSummary}
          disabled={loading}
          className="btn-surface inline-flex min-h-[44px] shrink-0 items-center justify-center whitespace-nowrap rounded-[6px] border px-4 text-sm font-semibold disabled:opacity-60 self-start sm:self-auto"
        >
          {loading ? "Memuat data..." : "Muat Ulang Data"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-[8px] border p-4 sm:flex-row sm:items-center sm:justify-between"
          style={{
            backgroundColor: "var(--status-err-bg)",
            borderColor: "var(--status-err-fg)",
            color: "var(--status-err-fg)",
          }}
        >
          <div className="flex items-start gap-2.5 text-sm font-medium">
            <IconAlert className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={refreshSummary}
            className="btn-surface inline-flex min-h-[44px] shrink-0 items-center justify-center whitespace-nowrap rounded-[6px] border px-3 text-sm font-semibold"
            style={{ borderColor: "var(--status-err-fg)" }}
          >
            Coba Lagi
          </button>
        </div>
      )}

      <section
        aria-label="Status inventaris dan tindakan cepat"
        className="grid gap-5 lg:grid-cols-12"
      >
        <div
          className="rounded-[8px] border p-5 sm:p-6 lg:col-span-8"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-base font-bold">Kapasitas Inventaris Saat Ini</h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Perbandingan unit siap pakai terhadap unit yang sedang dipinjam.
              </p>
            </div>
            <p className="font-mono-code text-sm font-semibold whitespace-nowrap" style={{ color: "var(--brand-primary)" }}>
              {availablePct}% unit tersedia
            </p>
          </div>

          <div
            role="progressbar"
            aria-valuenow={availablePct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Ketersediaan inventaris ${availablePct} persen`}
            className="mt-4 h-3 w-full overflow-hidden rounded-[4px] border"
            style={{
              backgroundColor: "var(--bg-subtle)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div
              className="h-full transition-all"
              style={{
                width: `${availablePct}%`,
                backgroundColor: "var(--brand-primary)",
              }}
            />
          </div>

          <dl
            className="mt-6 grid grid-cols-2 gap-4 border-t pt-5 sm:grid-cols-4"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                Total Barang
              </dt>
              <dd className="font-mono-code mt-1.5 text-2xl font-bold tabular-nums">
                {summary.totalUnits}
              </dd>
              <dd className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                {summary.totalItemTypes} jenis perangkat
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                Barang Tersedia
              </dt>
              <dd
                className="font-mono-code mt-1.5 text-2xl font-bold tabular-nums"
                style={{ color: "var(--status-ok-fg)" }}
              >
                {summary.availableUnits}
              </dd>
              <dd className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                Unit siap dipinjam
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                Barang Dipinjam
              </dt>
              <dd
                className="font-mono-code mt-1.5 text-2xl font-bold tabular-nums"
                style={{ color: "var(--accent-text)" }}
              >
                {summary.borrowedUnits}
              </dd>
              <dd className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                {summary.activeTransactions} transaksi aktif
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                Total Transaksi
              </dt>
              <dd className="font-mono-code mt-1.5 text-2xl font-bold tabular-nums">
                {summary.totalTransactions}
              </dd>
              <dd className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                {summary.completedTransactions} sudah selesai
              </dd>
            </div>
          </dl>
        </div>

        <div
          className="flex flex-col justify-between rounded-[8px] border p-5 sm:p-6 lg:col-span-4"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <div>
            <h2 className="text-base font-bold">Tindakan Operasional</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              Akses cepat sesuai wewenang {user.role === "admin" ? "Admin" : "Staff"}.
            </p>
          </div>

          <div className="mt-4 grid gap-2.5">
            <Link
              href="/peminjaman"
              className="btn-accent inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[6px] px-4 text-sm font-semibold whitespace-nowrap"
            >
              <IconBorrowOut className="shrink-0" />
              <span>Catat Peminjaman Baru</span>
            </Link>

            <Link
              href="/pengembalian"
              className="btn-subtle inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[6px] border px-4 text-sm font-semibold whitespace-nowrap"
            >
              <IconReturnIn className="shrink-0" />
              <span>Proses Pengembalian ({summary.activeTransactions})</span>
            </Link>

            <Link
              href="/inventaris"
              className="btn-surface inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[6px] border px-4 text-sm font-semibold whitespace-nowrap"
            >
              <IconBox className="shrink-0" />
              <span>
                {user.role === "admin" ? "Kelola Inventaris Barang" : "Lihat Status Barang"}
              </span>
            </Link>

            {user.role === "admin" && (
              <Link
                href="/pengguna"
                className="btn-surface inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[6px] border px-4 text-sm font-semibold whitespace-nowrap"
              >
                <IconUsers className="shrink-0" />
                <span>Kelola Akun Staff</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        <section
          aria-labelledby="active-loans-heading"
          className="rounded-[8px] border p-5 sm:p-6 lg:col-span-7"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <div className="flex items-center justify-between gap-3 border-b pb-3.5" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="min-w-0">
              <h2 id="active-loans-heading" className="text-base font-bold">
                Barang Sedang Dipinjam
              </h2>
              <p className="text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>
                Daftar transaksi aktif yang belum dikembalikan.
              </p>
            </div>
            <Link
              href="/pengembalian"
              className="inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-[6px] px-3 text-sm font-semibold underline-offset-4 hover:underline"
              style={{ color: "var(--brand-primary)" }}
            >
              Lihat Semua
            </Link>
          </div>

          {summary.activeBorrowings.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-semibold">Tidak ada barang yang sedang dipinjam</p>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                Seluruh unit inventaris saat ini berada di laboratorium. Mulai pencatatan jika ada peminjaman baru.
              </p>
              <Link
                href="/peminjaman"
                className="btn-subtle mt-4 inline-flex min-h-[44px] items-center rounded-[6px] border px-4 text-sm font-semibold"
              >
                Buka Form Peminjaman
              </Link>
            </div>
          ) : (
            <>
              <ul className="divide-y">
                {summary.activeBorrowings.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="font-mono-code shrink-0 whitespace-nowrap rounded-[4px] border px-1.5 py-0.5 text-xs font-medium"
                          style={{
                            borderColor: "var(--border-subtle)",
                            backgroundColor: "var(--bg-subtle)",
                          }}
                        >
                          {item.transactionCode}
                        </span>
                        <span className="font-semibold text-sm">{item.borrowerName}</span>
                      </div>
                      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                        <span className="font-mono-code">{item.itemCode}</span> {item.itemName} ({item.quantity} unit) · Pinjam {formatDateId(item.borrowDate)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <StatusBadge tone="warn" label="Dipinjam" />
                      <Link
                        href={`/pengembalian?trx=${encodeURIComponent(item.transactionCode)}`}
                        className="btn-subtle inline-flex min-h-[44px] items-center whitespace-nowrap rounded-[6px] border px-3 text-xs font-semibold"
                      >
                        Kembalikan
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
              {summary.activeTransactions > summary.activeBorrowings.length && (
                <p className="mt-2 border-t pt-3 text-xs" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>
                  Menampilkan {summary.activeBorrowings.length} dari {summary.activeTransactions} transaksi aktif terbaru.
                </p>
              )}
            </>
          )}
        </section>

        <section
          aria-labelledby="recent-activity-heading"
          className="space-y-5 lg:col-span-5"
        >
          <div
            className="rounded-[8px] border p-5 sm:p-6"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div className="border-b pb-3.5" style={{ borderColor: "var(--border-subtle)" }}>
              <h2 id="recent-activity-heading" className="text-base font-bold">
                Ringkasan Aktivitas Terbaru
              </h2>
              <p className="text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>
                {user.role === "admin"
                  ? "Catatan perubahan stok, peminjaman, pengembalian, dan pengguna."
                  : "Riwayat aktivitas operasional peminjaman dan stok lab."}
              </p>
            </div>

            {summary.recentActivities.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-semibold">Belum ada aktivitas tercatat</p>
                <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                  Aktivitas baru akan muncul otomatis setelah Anda mencatat peminjaman atau mengubah data barang.
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {summary.recentActivities.map((act) => (
                  <li key={act.id} className="py-3 text-sm">
                    <p className="font-medium leading-snug">{act.summary}</p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {act.targetLabel} · {formatDateTimeId(act.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {summary.attentionItems.length > 0 && (
            <div
              className="rounded-[8px] border p-5 sm:p-6"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <h2 className="text-base font-bold">Stok Sedang Terpakai</h2>
              <p className="mt-0.5 text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>
                Perangkat dengan stok berkurang karena peminjaman aktif.
              </p>
              <ul className="mt-3 divide-y">
                {summary.attentionItems.map((item) => {
                  const status = getItemAvailabilityInfo(item);
                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{item.name}</p>
                        <p className="font-mono-code text-xs" style={{ color: "var(--text-secondary)" }}>
                          {item.code} · Tersedia {item.availableStock}/{item.totalStock}
                        </p>
                      </div>
                      <StatusBadge tone={status.tone} label={status.label} />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
