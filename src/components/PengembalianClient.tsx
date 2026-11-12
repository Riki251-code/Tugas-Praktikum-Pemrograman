"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { formatDateId, getTodayInputDate } from "@/lib/format";
import { AppUser, BorrowingRecord } from "@/lib/types";
import { IconAlert, IconCheck, IconReturnIn, IconSearch } from "./icons";
import { ModalDialog } from "./ModalDialog";
import { StatusBadge } from "./StatusBadge";

interface PengembalianClientProps {
  user: AppUser;
  initialBorrowings: BorrowingRecord[];
  initialSearch?: string;
}

export function PengembalianClient({
  user,
  initialBorrowings,
  initialSearch = "",
}: PengembalianClientProps) {
  const [borrowings, setBorrowings] = useState<BorrowingRecord[]>(initialBorrowings);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [historyScope, setHistoryScope] = useState<"all" | "completed" | "mine">("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [returningRecord, setReturningRecord] = useState<BorrowingRecord | null>(null);
  const [returnDate, setReturnDate] = useState(getTodayInputDate());
  const [returnNotes, setReturnNotes] = useState("");
  const [returnError, setReturnError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setBorrowings(initialBorrowings);
  }, [initialBorrowings]);

  useEffect(() => {
    setSearchQuery(initialSearch);
  }, [initialSearch]);

  const reloadBorrowings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/borrowings", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Gagal memuat data pengembalian.");
        return;
      }
      setBorrowings((data?.borrowings ?? []) as BorrowingRecord[]);
    } catch {
      setError("Koneksi terputus saat memuat daftar transaksi.");
    } finally {
      setLoading(false);
    }
  }, []);

  const activeLoans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return borrowings.filter((b) => {
      if (b.status !== "dipinjam") return false;
      if (q) {
        return (
          b.transactionCode.toLowerCase().includes(q) ||
          b.borrowerName.toLowerCase().includes(q) ||
          b.itemCode.toLowerCase().includes(q) ||
          b.itemName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [borrowings, searchQuery]);

  const historyLoans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return borrowings.filter((b) => {
      if (historyScope === "completed" && b.status !== "selesai") return false;
      if (
        historyScope === "mine" &&
        b.recordedById !== user.id &&
        b.returnedById !== user.id
      ) {
        return false;
      }
      if (q) {
        return (
          b.transactionCode.toLowerCase().includes(q) ||
          b.borrowerName.toLowerCase().includes(q) ||
          b.itemCode.toLowerCase().includes(q) ||
          b.itemName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [borrowings, historyScope, searchQuery, user.id]);

  function openReturnModal(record: BorrowingRecord) {
    setReturningRecord(record);
    setReturnDate(getTodayInputDate());
    setReturnNotes("");
    setReturnError(null);
  }

  async function handleConfirmReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!returningRecord) return;
    setReturnError(null);

    if (!returnDate) {
      setReturnError("Tanggal pengembalian wajib diisi.");
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/borrowings/${returningRecord.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnDate,
          returnNotes: returnNotes.trim(),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setReturnError(data?.error ?? "Gagal memproses pengembalian barang.");
        return;
      }

      const done = data.borrowing as BorrowingRecord;
      setReturningRecord(null);
      setFeedback(
        `Pengembalian ${done.transactionCode} selesai: ${done.quantity} unit ${done.itemName} dikembalikan ke stok tersedia.`,
      );
      await reloadBorrowings();
    } catch {
      setReturnError("Koneksi terputus saat memproses pengembalian.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Pengembalian Barang &amp; Riwayat
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Proses pengembalian perangkat yang dipinjam untuk memperbarui stok tersedia dan menutup transaksi.
          </p>
        </div>

        <Link
          href="/peminjaman"
          className="btn-surface inline-flex min-h-[44px] shrink-0 items-center justify-center whitespace-nowrap rounded-[6px] border px-4 text-sm font-semibold self-start sm:self-auto"
        >
          Catat Peminjaman Baru
        </Link>
      </div>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-2 rounded-[8px] border px-4 py-3 text-sm font-medium sm:flex-row sm:items-center sm:justify-between"
          style={{
            backgroundColor: "var(--status-ok-bg)",
            borderColor: "var(--status-ok-fg)",
            color: "var(--status-ok-fg)",
          }}
        >
          <div className="flex items-center gap-2">
            <IconCheck />
            <span>{feedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="min-h-[44px] shrink-0 self-end px-2 text-xs font-bold underline hover:opacity-80 sm:self-auto"
          >
            Tutup
          </button>
        </div>
      )}

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
          <div className="flex items-start gap-2 text-sm font-medium">
            <IconAlert className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={reloadBorrowings}
            className="btn-surface min-h-[44px] shrink-0 whitespace-nowrap rounded-[6px] border px-3 text-sm font-semibold"
            style={{ borderColor: "var(--status-err-fg)" }}
          >
            Coba Lagi
          </button>
        </div>
      )}

      <div
        className="rounded-[8px] border p-4 sm:p-5"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <label
          htmlFor="search-returns"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          Cari Transaksi Aktif atau Riwayat
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex flex-1 items-center">
            <span
              className="pointer-events-none absolute left-3"
              style={{ color: "var(--text-secondary)" }}
            >
              <IconSearch />
            </span>
            <input
              id="search-returns"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode (PJM-0001), nama peminjam, atau nama barang..."
              className="min-h-[44px] w-full rounded-[6px] border py-2 pl-10 pr-3 text-sm"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-control)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="btn-subtle min-h-[44px] shrink-0 whitespace-nowrap rounded-[6px] border px-4 text-sm font-semibold"
            >
              Reset Pencarian
            </button>
          )}
        </div>
      </div>

      <section aria-labelledby="active-returns-heading" className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="active-returns-heading" className="text-lg font-bold">
            Barang yang Sedang Dipinjam ({activeLoans.length})
          </h2>
        </div>

        {loading ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-[8px] border p-8 text-center text-sm"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            Memuat daftar barang yang dipinjam...
          </div>
        ) : activeLoans.length === 0 ? (
          <div
            className="rounded-[8px] border p-8 text-center"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <p className="text-base font-bold">
              {searchQuery
                ? "Tidak ada peminjaman aktif yang cocok"
                : "Semua barang sudah kembali"}
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {searchQuery
                ? "Hapus kata kunci pencarian untuk melihat semua peminjaman aktif."
                : "Saat ini tidak ada transaksi peminjaman berstatus Dipinjam."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {activeLoans.map((loan) => (
              <article
                key={loan.id}
                className="flex flex-col justify-between gap-4 rounded-[8px] border p-4 sm:p-5"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="font-mono-code rounded-[4px] border px-2 py-0.5 text-xs font-semibold"
                      style={{
                        borderColor: "var(--border-subtle)",
                        backgroundColor: "var(--bg-subtle)",
                      }}
                    >
                      {loan.transactionCode}
                    </span>
                    <StatusBadge tone="warn" label="Dipinjam" />
                  </div>

                  <div>
                    <h3 className="text-base font-bold">
                      {loan.itemCode} - {loan.itemName}
                    </h3>
                    <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                      Peminjam: <strong style={{ color: "var(--text-primary)" }}>{loan.borrowerName}</strong> · Jumlah:{" "}
                      <span className="font-mono-code font-semibold" style={{ color: "var(--text-primary)" }}>
                        {loan.quantity} unit
                      </span>
                    </p>
                  </div>

                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    Dipinjam pada {formatDateId(loan.borrowDate)} · Dicatat oleh {loan.recordedByName}
                  </p>
                  {loan.notes && (
                    <p
                      className="rounded-[4px] border px-2.5 py-1.5 text-xs"
                      style={{
                        backgroundColor: "var(--bg-subtle)",
                        borderColor: "var(--border-subtle)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Catatan: {loan.notes}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => openReturnModal(loan)}
                  className="btn-accent inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[6px] px-4 text-sm font-semibold"
                >
                  <IconReturnIn />
                  <span>Proses Pengembalian</span>
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="history-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="history-heading" className="text-lg font-bold">
              Riwayat Peminjaman &amp; Pengembalian
            </h2>
            <p className="text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>
              {user.role === "admin"
                ? "Seluruh riwayat transaksi peminjaman dan pengembalian laboratorium."
                : "Riwayat transaksi operasional laboratorium atau yang Anda catat."}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filter riwayat transaksi"
            className="inline-flex flex-wrap rounded-[6px] border p-1 gap-1 self-start sm:self-auto"
            style={{
              backgroundColor: "var(--bg-subtle)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={historyScope === "all"}
              onClick={() => setHistoryScope("all")}
              className="min-h-[44px] rounded-[4px] px-3 text-xs font-semibold"
              style={
                historyScope === "all"
                  ? { backgroundColor: "var(--bg-surface)", color: "var(--brand-primary)" }
                  : { color: "var(--text-secondary)" }
              }
            >
              Semua
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={historyScope === "completed"}
              onClick={() => setHistoryScope("completed")}
              className="min-h-[44px] rounded-[4px] px-3 text-xs font-semibold"
              style={
                historyScope === "completed"
                  ? { backgroundColor: "var(--bg-surface)", color: "var(--brand-primary)" }
                  : { color: "var(--text-secondary)" }
              }
            >
              Sudah Selesai
            </button>
            {user.role === "staff" && (
              <button
                type="button"
                role="tab"
                aria-selected={historyScope === "mine"}
                onClick={() => setHistoryScope("mine")}
                className="min-h-[44px] rounded-[4px] px-3 text-xs font-semibold"
                style={
                  historyScope === "mine"
                    ? { backgroundColor: "var(--bg-surface)", color: "var(--brand-primary)" }
                    : { color: "var(--text-secondary)" }
                }
              >
                Dicatat oleh Saya
              </button>
            )}
          </div>
        </div>

        {historyLoans.length === 0 ? (
          <div
            className="rounded-[8px] border p-8 text-center"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <p className="text-sm font-semibold">Belum ada riwayat transaksi pada filter ini</p>
            <p className="mt-1 text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>
              Riwayat lengkap akan tampil setelah ada transaksi peminjaman atau pengembalian.
            </p>
          </div>
        ) : (
          <>
            <div
              className="hidden lg:block overflow-x-auto rounded-[8px] border"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr
                    className="border-b text-xs uppercase tracking-wide"
                    style={{
                      backgroundColor: "var(--bg-subtle)",
                      borderColor: "var(--border-subtle)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Kode</th>
                    <th className="px-4 py-3 font-semibold">Peminjam</th>
                    <th className="px-4 py-3 font-semibold">Barang &amp; Jumlah</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Tanggal Pinjam</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Tanggal Kembali</th>
                    <th className="px-4 py-3 font-semibold">Petugas</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {historyLoans.map((trx) => (
                    <tr key={trx.id} className="table-row-hover">
                      <td className="px-4 py-3.5 align-middle">
                        <span
                          className="font-mono-code inline-block whitespace-nowrap rounded-[4px] border px-2 py-0.5 text-xs font-semibold"
                          style={{
                            borderColor: "var(--border-subtle)",
                            backgroundColor: "var(--bg-subtle)",
                          }}
                        >
                          {trx.transactionCode}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-middle font-semibold">
                        {trx.borrowerName}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <p className="font-medium">
                          {trx.itemName} ({trx.quantity} unit)
                        </p>
                        <p className="font-mono-code text-xs" style={{ color: "var(--text-secondary)" }}>
                          {trx.itemCode}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                        {formatDateId(trx.borrowDate)}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <span className="whitespace-nowrap">
                          {trx.returnDate ? formatDateId(trx.returnDate) : "-"}
                        </span>
                        {trx.returnNotes && (
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            {trx.returnNotes}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 align-middle text-xs" style={{ color: "var(--text-secondary)" }}>
                        <p>Pinjam: {trx.recordedByName}</p>
                        {trx.returnedByName && <p>Kembali: {trx.returnedByName}</p>}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <StatusBadge
                          tone={trx.status === "dipinjam" ? "warn" : "ok"}
                          label={trx.status === "dipinjam" ? "Dipinjam" : "Selesai"}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
              {historyLoans.map((trx) => (
                <article
                  key={trx.id}
                  className="rounded-[8px] border p-4 space-y-2"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className="font-mono-code inline-block whitespace-nowrap rounded-[4px] border px-2 py-0.5 text-xs font-semibold"
                        style={{
                          borderColor: "var(--border-subtle)",
                          backgroundColor: "var(--bg-subtle)",
                        }}
                      >
                        {trx.transactionCode}
                      </span>
                      <h3 className="mt-1 text-sm font-bold">{trx.borrowerName}</h3>
                    </div>
                    <StatusBadge
                      tone={trx.status === "dipinjam" ? "warn" : "ok"}
                      label={trx.status === "dipinjam" ? "Dipinjam" : "Selesai"}
                    />
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {trx.itemCode} - {trx.itemName} ({trx.quantity} unit)
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    Pinjam: {formatDateId(trx.borrowDate)} · Kembali:{" "}
                    {trx.returnDate ? formatDateId(trx.returnDate) : "-"}
                  </p>
                  {trx.returnNotes && (
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      Kondisi: {trx.returnNotes}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <ModalDialog
        open={Boolean(returningRecord)}
        onClose={() => setReturningRecord(null)}
        title="Konfirmasi Pengembalian Barang"
        description={
          returningRecord
            ? `${returningRecord.transactionCode} · ${returningRecord.itemCode} - ${returningRecord.itemName} (${returningRecord.quantity} unit)`
            : undefined
        }
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleConfirmReturn} className="space-y-4" noValidate>
          {returnError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-[6px] border px-3 py-2.5 text-sm font-medium"
              style={{
                backgroundColor: "var(--status-err-bg)",
                borderColor: "var(--status-err-fg)",
                color: "var(--status-err-fg)",
              }}
            >
              <IconAlert className="mt-0.5 shrink-0" />
              <span>{returnError}</span>
            </div>
          )}

          {returningRecord && (
            <div
              className="rounded-[6px] border p-3 text-sm"
              style={{
                backgroundColor: "var(--bg-subtle)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <p>
                Peminjam: <strong>{returningRecord.borrowerName}</strong>
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                Dipinjam sejak {formatDateId(returningRecord.borrowDate)}. Stok tersedia akan bertambah{" "}
                <span className="font-mono-code font-semibold">{returningRecord.quantity}</span> unit setelah dikonfirmasi.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="return-date" className="mb-1.5 block text-sm font-semibold">
              Tanggal Pengembalian
            </label>
            <input
              id="return-date"
              type="date"
              required
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="min-h-[44px] w-full rounded-[6px] border px-3 text-sm"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-control)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div>
            <label htmlFor="return-notes" className="mb-1.5 block text-sm font-semibold">
              Catatan Kondisi (Opsional)
            </label>
            <textarea
              id="return-notes"
              rows={2}
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder="Contoh: Lengkap dan berfungsi baik"
              className="w-full rounded-[6px] border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-control)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setReturningRecord(null)}
              className="btn-surface min-h-[44px] rounded-[6px] border px-4 text-sm font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={processing}
              className="btn-accent min-h-[44px] rounded-[6px] px-4 text-sm font-semibold disabled:opacity-60"
            >
              {processing ? "Memproses..." : "Konfirmasi Pengembalian"}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}

