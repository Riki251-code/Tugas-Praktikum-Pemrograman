"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { formatDateId, getTodayInputDate } from "@/lib/format";
import { BorrowingRecord, InventoryItem } from "@/lib/types";
import { IconAlert, IconCheck, IconSearch } from "./icons";
import { StatusBadge } from "./StatusBadge";

interface PeminjamanClientProps {
  initialItems: InventoryItem[];
  initialBorrowings: BorrowingRecord[];
  preselectedItemId?: string;
}

export function PeminjamanClient({
  initialItems,
  initialBorrowings,
  preselectedItemId,
}: PeminjamanClientProps) {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [borrowings, setBorrowings] = useState<BorrowingRecord[]>(initialBorrowings);

  const defaultSelectedItem = useMemo(() => {
    if (preselectedItemId) {
      const match = items.find(
        (i) => i.id === preselectedItemId && i.availableStock > 0,
      );
      if (match) return match.id;
    }
    const firstAvailable = items.find((i) => i.availableStock > 0);
    return firstAvailable?.id ?? "";
  }, [items, preselectedItemId]);

  const [borrowerName, setBorrowerName] = useState("");
  const [itemId, setItemId] = useState(defaultSelectedItem);

  useEffect(() => {
    setItems(initialItems);
    setBorrowings(initialBorrowings);
  }, [initialItems, initialBorrowings]);

  useEffect(() => {
    if (preselectedItemId) {
      const match = initialItems.find(
        (i) => i.id === preselectedItemId && i.availableStock > 0,
      );
      if (match) setItemId(match.id);
    }
  }, [initialItems, preselectedItemId]);
  const [quantity, setQuantity] = useState("1");
  const [borrowDate, setBorrowDate] = useState(getTodayInputDate());
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | "dipinjam" | "selesai">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === itemId) ?? null,
    [items, itemId],
  );

  const reloadData = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const [itemsRes, borrowingsRes] = await Promise.all([
        fetch("/api/items", { cache: "no-store" }),
        fetch("/api/borrowings", { cache: "no-store" }),
      ]);
      const itemsJson = await itemsRes.json().catch(() => null);
      const borrowingsJson = await borrowingsRes.json().catch(() => null);
      if (!itemsRes.ok || !borrowingsRes.ok) {
        setListError(
          itemsJson?.error || borrowingsJson?.error || "Gagal memperbarui data peminjaman.",
        );
        return;
      }
      const nextItems = (itemsJson?.items ?? []) as InventoryItem[];
      setItems(nextItems);
      setBorrowings((borrowingsJson?.borrowings ?? []) as BorrowingRecord[]);

      setItemId((current) => {
        const stillAvailable = nextItems.find(
          (i) => i.id === current && i.availableStock > 0,
        );
        if (stillAvailable) return stillAvailable.id;
        return nextItems.find((i) => i.availableStock > 0)?.id ?? "";
      });
    } catch {
      setListError("Gagal terhubung ke server saat memuat transaksi.");
    } finally {
      setLoadingList(false);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFeedback(null);

    if (!borrowerName.trim()) {
      setFormError("Nama peminjam wajib diisi.");
      return;
    }
    if (!itemId) {
      setFormError("Pilih barang yang tersedia untuk dipinjam.");
      return;
    }
    const parsedQty = Number(quantity);
    if (!Number.isInteger(parsedQty) || parsedQty < 1) {
      setFormError("Jumlah barang minimal 1 unit.");
      return;
    }
    if (selectedItem && parsedQty > selectedItem.availableStock) {
      setFormError(
        `Stok tersedia untuk ${selectedItem.name} hanya ${selectedItem.availableStock} unit.`,
      );
      return;
    }
    if (!borrowDate) {
      setFormError("Tanggal peminjaman wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/borrowings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          borrowerName: borrowerName.trim(),
          itemId,
          quantity: parsedQty,
          borrowDate,
          notes: notes.trim(),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setFormError(data?.error ?? "Gagal menyimpan transaksi peminjaman.");
        return;
      }

      const created = data.borrowing as BorrowingRecord;
      setBorrowerName("");
      setQuantity("1");
      setNotes("");
      setFeedback(
        `Transaksi ${created.transactionCode} tersimpan: ${created.quantity} unit ${created.itemName} dipinjam oleh ${created.borrowerName}.`,
      );
      await reloadData();
    } catch {
      setFormError("Koneksi terputus saat menyimpan transaksi.");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredBorrowings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return borrowings.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (q) {
        const match =
          b.transactionCode.toLowerCase().includes(q) ||
          b.borrowerName.toLowerCase().includes(q) ||
          b.itemCode.toLowerCase().includes(q) ||
          b.itemName.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [borrowings, statusFilter, searchQuery]);

  const anyAvailableItem = items.some((i) => i.availableStock > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Manajemen Peminjaman Barang
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Catat peminjaman peralatan lab. Stok tersedia otomatis berkurang saat transaksi disimpan.
        </p>
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
            className="min-h-[44px] self-end px-2 text-xs font-bold underline hover:opacity-80 sm:self-auto"
          >
            Tutup
          </button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-12 xl:items-start">
        <section
          aria-labelledby="borrow-form-heading"
          className="rounded-[8px] border p-5 sm:p-6 xl:col-span-4"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <div className="border-b pb-3.5" style={{ borderColor: "var(--border-subtle)" }}>
            <h2 id="borrow-form-heading" className="text-base font-bold">
              Catat Peminjaman Baru
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>
              Lengkapi identitas peminjam dan perangkat yang diambil.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
            {formError && (
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
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label htmlFor="borrower-name" className="mb-1.5 block text-sm font-semibold">
                Nama Peminjam
              </label>
              <input
                id="borrower-name"
                type="text"
                required
                value={borrowerName}
                onChange={(e) => setBorrowerName(e.target.value)}
                placeholder="Nama mahasiswa, dosen, atau kelas"
                className="min-h-[44px] w-full rounded-[6px] border px-3 text-sm"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-control)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div>
              <label htmlFor="borrow-item" className="mb-1.5 block text-sm font-semibold">
                Pilih Barang
              </label>
              <select
                id="borrow-item"
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                disabled={!anyAvailableItem}
                className="min-h-[44px] w-full rounded-[6px] border px-3 text-sm disabled:opacity-60"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-control)",
                  color: "var(--text-primary)",
                }}
              >
                {items.length === 0 && <option value="">Belum ada barang</option>}
                {items.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                    disabled={item.availableStock === 0}
                  >
                    {item.code} - {item.name} (Tersedia: {item.availableStock})
                  </option>
                ))}
              </select>
              {selectedItem && (
                <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                  Stok tersedia saat ini:{" "}
                  <span className="font-mono-code font-semibold">
                    {selectedItem.availableStock}
                  </span>{" "}
                  dari {selectedItem.totalStock} unit ({selectedItem.location}).
                </p>
              )}
              {!anyAvailableItem && (
                <p className="mt-1 text-xs font-medium" style={{ color: "var(--status-err-fg)" }}>
                  Semua stok barang sedang habis dipinjam. Proses pengembalian terlebih dahulu.
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 items-end">
              <div>
                <label htmlFor="borrow-qty" className="mb-1.5 block text-sm font-semibold">
                  Jumlah (Unit)
                </label>
                <input
                  id="borrow-qty"
                  type="number"
                  min={1}
                  max={selectedItem?.availableStock ?? 1}
                  step={1}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="font-mono-code min-h-[44px] w-full rounded-[6px] border px-3 text-sm"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-control)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div>
                <label htmlFor="borrow-date" className="mb-1.5 block text-sm font-semibold">
                  Tanggal Pinjam
                </label>
                <input
                  id="borrow-date"
                  type="date"
                  required
                  value={borrowDate}
                  onChange={(e) => setBorrowDate(e.target.value)}
                  className="min-h-[44px] w-full rounded-[6px] border px-3 text-sm"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-control)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="borrow-notes" className="mb-1.5 block text-sm font-semibold">
                Catatan (Opsional)
              </label>
              <textarea
                id="borrow-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Praktikum Jaringan Komputer Ruang B2"
                className="w-full rounded-[6px] border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-control)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !anyAvailableItem}
              className="btn-accent inline-flex min-h-[44px] w-full items-center justify-center rounded-[6px] px-4 text-sm font-semibold disabled:opacity-60"
            >
              {submitting ? "Menyimpan transaksi..." : "Simpan Transaksi"}
            </button>
          </form>
        </section>

        <section
          aria-labelledby="borrow-list-heading"
          className="space-y-4 xl:col-span-8 min-w-0"
        >
          <div
            className="rounded-[8px] border p-4 sm:p-5 space-y-4"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="borrow-list-heading" className="text-base font-bold">
                  Daftar Transaksi Peminjaman
                </h2>
                <p className="text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>
                  Total {borrowings.length} transaksi tercatat.
                </p>
              </div>

              <div
                role="tablist"
                aria-label="Filter status peminjaman"
                className="inline-flex rounded-[6px] border p-1 gap-1"
                style={{
                  backgroundColor: "var(--bg-subtle)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                {(
                  [
                    ["all", "Semua"],
                    ["dipinjam", "Dipinjam"],
                    ["selesai", "Selesai"],
                  ] as const
                ).map(([value, label]) => {
                  const selected = statusFilter === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setStatusFilter(value)}
                      className="min-h-[44px] rounded-[4px] px-3 text-xs font-semibold transition-colors"
                      style={
                        selected
                          ? {
                              backgroundColor: "var(--bg-surface)",
                              color: "var(--brand-primary)",
                            }
                          : {
                              color: "var(--text-secondary)",
                            }
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="search-borrowings" className="sr-only">
                Cari transaksi peminjaman
              </label>
              <div className="relative flex items-center">
                <span
                  className="pointer-events-none absolute left-3"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <IconSearch />
                </span>
                <input
                  id="search-borrowings"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kode transaksi (PJM-0001), nama peminjam, atau barang..."
                  className="min-h-[44px] w-full rounded-[6px] border py-2 pl-10 pr-3 text-sm"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-control)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>
          </div>

          {listError && (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-[8px] border p-4 sm:flex-row sm:items-center sm:justify-between"
              style={{
                backgroundColor: "var(--status-err-bg)",
                borderColor: "var(--status-err-fg)",
                color: "var(--status-err-fg)",
              }}
            >
              <span className="text-sm font-medium">{listError}</span>
              <button
                type="button"
                onClick={reloadData}
                className="btn-surface min-h-[44px] shrink-0 whitespace-nowrap rounded-[6px] border px-3 text-sm font-semibold"
                style={{ borderColor: "var(--status-err-fg)" }}
              >
                Coba Lagi
              </button>
            </div>
          )}

          {loadingList ? (
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
              Memperbarui daftar transaksi...
            </div>
          ) : filteredBorrowings.length === 0 ? (
            <div
              className="rounded-[8px] border p-8 text-center"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <p className="text-base font-bold">
                {borrowings.length === 0
                  ? "Belum ada transaksi peminjaman"
                  : "Tidak ada transaksi yang cocok"}
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                {borrowings.length === 0
                  ? "Isi formulir di samping untuk mencatat peminjaman perangkat pertama."
                  : "Ubah kata kunci pencarian atau pilih tab status Semua."}
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
                      <th className="px-3 py-3 font-semibold whitespace-nowrap">Kode</th>
                      <th className="px-3 py-3 font-semibold">Peminjam</th>
                      <th className="px-3 py-3 font-semibold">Barang</th>
                      <th className="px-3 py-3 font-semibold text-right whitespace-nowrap">Jumlah</th>
                      <th className="px-3 py-3 font-semibold whitespace-nowrap">Tanggal</th>
                      <th className="px-3 py-3 font-semibold whitespace-nowrap">Status</th>
                      <th className="px-3 py-3 font-semibold text-right whitespace-nowrap">Tindak Lanjut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredBorrowings.map((trx) => (
                      <tr key={trx.id} className="table-row-hover">
                        <td className="px-3 py-3.5 align-middle">
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
                        <td className="px-3 py-3.5 align-middle">
                          <p className="font-semibold">{trx.borrowerName}</p>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            Dicatat: {trx.recordedByName}
                          </p>
                        </td>
                        <td className="px-3 py-3.5 align-middle">
                          <p className="font-medium">{trx.itemName}</p>
                          <p className="font-mono-code text-xs" style={{ color: "var(--text-secondary)" }}>
                            {trx.itemCode}
                          </p>
                        </td>
                        <td className="font-mono-code px-3 py-3.5 text-right font-semibold tabular-nums align-middle whitespace-nowrap">
                          {trx.quantity}
                        </td>
                        <td className="px-3 py-3.5 align-middle whitespace-nowrap">
                          {formatDateId(trx.borrowDate)}
                        </td>
                        <td className="px-3 py-3.5 align-middle">
                          <StatusBadge
                            tone={trx.status === "dipinjam" ? "warn" : "ok"}
                            label={trx.status === "dipinjam" ? "Dipinjam" : "Selesai"}
                          />
                        </td>
                        <td className="px-3 py-3.5 text-right align-middle whitespace-nowrap">
                          {trx.status === "dipinjam" ? (
                            <Link
                              href={`/pengembalian?trx=${encodeURIComponent(trx.transactionCode)}`}
                              className="btn-brand-tint inline-flex min-h-[44px] items-center whitespace-nowrap rounded-[6px] border px-3 text-xs font-semibold"
                            >
                              Kembalikan
                            </Link>
                          ) : (
                            <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                              Kembali {formatDateId(trx.returnDate)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
                {filteredBorrowings.map((trx) => (
                  <article
                    key={trx.id}
                    className="flex flex-col justify-between gap-2.5 rounded-[8px] border p-4"
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      borderColor: "var(--border-subtle)",
                    }}
                  >
                    <div className="space-y-2">
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
                          <h3 className="mt-1.5 text-sm font-bold">{trx.borrowerName}</h3>
                        </div>
                        <StatusBadge
                          tone={trx.status === "dipinjam" ? "warn" : "ok"}
                          label={trx.status === "dipinjam" ? "Dipinjam" : "Selesai"}
                        />
                      </div>

                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        <span className="font-mono-code">{trx.itemCode}</span> {trx.itemName} ({trx.quantity} unit) · Pinjam {formatDateId(trx.borrowDate)}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        Dicatat: {trx.recordedByName}
                        {trx.returnDate ? ` · Kembali: ${formatDateId(trx.returnDate)}` : ""}
                      </p>
                    </div>

                    {trx.status === "dipinjam" && (
                      <Link
                        href={`/pengembalian?trx=${encodeURIComponent(trx.transactionCode)}`}
                        className="btn-brand-tint inline-flex min-h-[44px] w-full items-center justify-center rounded-[6px] border px-3 text-sm font-semibold"
                      >
                        Proses Pengembalian
                      </Link>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

