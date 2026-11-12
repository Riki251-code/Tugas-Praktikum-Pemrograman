"use client";

import Link from "next/link";
import { FormEvent, useCallback, useMemo, useState } from "react";
import { getItemAvailabilityInfo } from "@/lib/format";
import { DEFAULT_CATEGORIES } from "@/lib/seed-data";
import { AppUser, InventoryItem } from "@/lib/types";
import { IconAlert, IconCheck, IconEdit, IconPlus, IconSearch, IconTrash } from "./icons";
import { ModalDialog } from "./ModalDialog";
import { StatusBadge } from "./StatusBadge";

interface InventarisClientProps {
  user: AppUser;
  initialItems: InventoryItem[];
}

interface ItemFormState {
  code: string;
  name: string;
  category: string;
  totalStock: string;
  location: string;
}

const EMPTY_FORM: ItemFormState = {
  code: "",
  name: "",
  category: DEFAULT_CATEGORIES[0],
  totalStock: "1",
  location: "Lab Komputer Utama",
};

export function InventarisClient({ user, initialItems }: InventarisClientProps) {
  const isAdmin = user.role === "admin";
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formState, setFormState] = useState<ItemFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/items", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Gagal memuat daftar barang.");
        return;
      }
      setItems((data?.items ?? []) as InventoryItem[]);
    } catch {
      setError("Koneksi gagal saat memuat inventaris barang.");
    } finally {
      setLoading(false);
    }
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    for (const item of items) {
      if (item.category) set.add(item.category);
    }
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (q) {
        const match =
          item.code.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (categoryFilter !== "all" && item.category !== categoryFilter) {
        return false;
      }
      if (availabilityFilter === "tersedia" && item.availableStock <= 0) {
        return false;
      }
      if (availabilityFilter === "dipinjam" && item.availableStock === item.totalStock) {
        return false;
      }
      if (availabilityFilter === "habis" && item.availableStock > 0) {
        return false;
      }
      return true;
    });
  }, [items, query, categoryFilter, availabilityFilter]);

  const isFiltered =
    query.trim() !== "" || categoryFilter !== "all" || availabilityFilter !== "all";

  function openCreateModal() {
    setEditingItem(null);
    setFormState({
      ...EMPTY_FORM,
      code: `BR${String(items.length + 1).padStart(3, "0")}`,
    });
    setFormError(null);
    setFormOpen(true);
  }

  function openEditModal(item: InventoryItem) {
    setEditingItem(item);
    setFormState({
      code: item.code,
      name: item.name,
      category: item.category,
      totalStock: String(item.totalStock),
      location: item.location,
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSaveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsedStock = Number(formState.totalStock);
    if (!formState.code.trim() || !formState.name.trim() || !formState.category.trim()) {
      setFormError("Kode, nama barang, dan kategori wajib diisi.");
      return;
    }
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      setFormError("Stok harus berupa angka bulat minimal 0.");
      return;
    }

    setSaving(true);
    try {
      const endpoint = editingItem ? `/api/items/${editingItem.id}` : "/api/items";
      const method = editingItem ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formState.code.trim().toUpperCase(),
          name: formState.name.trim(),
          category: formState.category.trim(),
          totalStock: parsedStock,
          location: formState.location.trim(),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setFormError(data?.error ?? "Gagal menyimpan data barang.");
        return;
      }

      setFormOpen(false);
      setFeedback(
        editingItem
          ? `Barang ${data.item.code} (${data.item.name}) berhasil diperbarui.`
          : `Barang ${data.item.code} (${data.item.name}) berhasil ditambahkan.`,
      );
      await loadItems();
    } catch {
      setFormError("Gagal menghubungi server saat menyimpan barang.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingItem) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      const response = await fetch(`/api/items/${deletingItem.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setDeleteError(data?.error ?? "Gagal menghapus barang.");
        return;
      }
      const deletedLabel = `${deletingItem.code} (${deletingItem.name})`;
      setDeletingItem(null);
      setFeedback(`Barang ${deletedLabel} berhasil dihapus dari inventaris.`);
      await loadItems();
    } catch {
      setDeleteError("Koneksi gagal saat menghapus barang.");
    } finally {
      setDeleting(false);
    }
  }

  function resetFilters() {
    setQuery("");
    setCategoryFilter("all");
    setAvailabilityFilter("all");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {isAdmin ? "Manajemen Inventaris Barang" : "Daftar & Status Barang Lab"}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {isAdmin
              ? "Tambah, ubah, cari, dan kelola stok peralatan laboratorium."
              : "Cari peralatan laboratorium dan pantau status ketersediaan unit sebelum peminjaman."}
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openCreateModal}
            className="btn-accent inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[6px] px-4 text-sm font-semibold self-start sm:self-auto"
          >
            <IconPlus className="shrink-0" />
            <span>Tambah Barang</span>
          </button>
        )}
      </div>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between gap-3 rounded-[8px] border px-4 py-3 text-sm font-medium"
          style={{
            backgroundColor: "var(--status-ok-bg)",
            borderColor: "var(--status-ok-fg)",
            color: "var(--status-ok-fg)",
          }}
        >
          <div className="flex items-center gap-2">
            <IconCheck className="shrink-0" />
            <span>{feedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="min-h-[44px] shrink-0 px-2 text-xs font-bold underline hover:opacity-80"
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
            onClick={loadItems}
            className="btn-surface inline-flex min-h-[44px] shrink-0 items-center justify-center whitespace-nowrap rounded-[6px] border px-3 text-sm font-semibold"
            style={{ borderColor: "var(--status-err-fg)" }}
          >
            Coba Lagi
          </button>
        </div>
      )}

      <section
        aria-label="Filter dan pencarian barang"
        className="rounded-[8px] border p-4 sm:p-5"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:items-end">
          <div className="sm:col-span-2 lg:flex-1 lg:min-w-0">
            <label
              htmlFor="search-items"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-secondary)" }}
            >
              Pencarian Barang
            </label>
            <div className="relative flex items-center">
              <span
                className="pointer-events-none absolute left-3"
                style={{ color: "var(--text-secondary)" }}
              >
                <IconSearch />
              </span>
              <input
                id="search-items"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari kode (BR001), nama, atau lokasi..."
                className="min-h-[44px] w-full rounded-[6px] border py-2 pl-10 pr-3 text-sm"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-control)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>

          <div className="lg:w-52 lg:shrink-0">
            <label
              htmlFor="filter-category"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-secondary)" }}
            >
              Kategori
            </label>
            <select
              id="filter-category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="min-h-[44px] w-full rounded-[6px] border px-3 text-sm"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-control)",
                color: "var(--text-primary)",
              }}
            >
              <option value="all">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:w-56 lg:shrink-0">
            <label
              htmlFor="filter-availability"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-secondary)" }}
            >
              Status Ketersediaan
            </label>
            <select
              id="filter-availability"
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="min-h-[44px] w-full rounded-[6px] border px-3 text-sm"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-control)",
                color: "var(--text-primary)",
              }}
            >
              <option value="all">Semua Status</option>
              <option value="tersedia">Tersedia (&gt; 0 unit)</option>
              <option value="dipinjam">Sedang Dipinjam Sebagian</option>
              <option value="habis">Stok Habis (0 unit)</option>
            </select>
          </div>

          {isFiltered && (
            <div className="sm:col-span-2 lg:w-auto lg:shrink-0">
              <button
                type="button"
                onClick={resetFilters}
                className="btn-subtle min-h-[44px] w-full whitespace-nowrap rounded-[6px] border px-4 text-xs font-semibold lg:w-auto"
              >
                Reset Filter
              </button>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs" style={{ color: "var(--text-secondary)" }}>
          Menampilkan <span className="font-mono-code font-semibold">{filteredItems.length}</span> dari{" "}
          <span className="font-mono-code font-semibold">{items.length}</span> jenis barang.
        </p>
      </section>

      {loading ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[8px] border p-10 text-center text-sm font-medium"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-secondary)",
          }}
        >
          Memuat daftar inventaris barang...
        </div>
      ) : filteredItems.length === 0 ? (
        <div
          className="rounded-[8px] border p-10 text-center"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <p className="text-base font-bold">
            {isFiltered ? "Tidak ada barang yang cocok dengan filter" : "Belum ada data barang"}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {isFiltered
              ? "Ubah kata kunci pencarian atau reset filter kategori untuk melihat semua perangkat."
              : isAdmin
                ? "Tambahkan peralatan laboratorium pertama Anda menggunakan tombol Tambah Barang."
                : "Inventaris barang laboratorium belum diisi oleh Admin."}
          </p>
          {isFiltered ? (
            <button
              type="button"
              onClick={resetFilters}
              className="btn-subtle mt-4 inline-flex min-h-[44px] items-center rounded-[6px] border px-4 text-sm font-semibold"
            >
              Reset Filter
            </button>
          ) : (
            isAdmin && (
              <button
                type="button"
                onClick={openCreateModal}
                className="btn-accent mt-4 inline-flex min-h-[44px] items-center rounded-[6px] px-4 text-sm font-semibold"
              >
                Tambah Barang Pertama
              </button>
            )
          )}
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
                  <th className="px-4 py-3 font-semibold">Nama Barang</th>
                  <th className="px-4 py-3 font-semibold">Kategori</th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Stok Total</th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Tersedia</th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Dipinjam</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredItems.map((item) => {
                  const status = getItemAvailabilityInfo(item);
                  return (
                    <tr key={item.id} className="table-row-hover">
                      <td className="px-4 py-3.5 align-middle">
                        <span
                          className="font-mono-code inline-block whitespace-nowrap rounded-[4px] border px-2 py-0.5 text-xs font-semibold"
                          style={{
                            borderColor: "var(--border-subtle)",
                            backgroundColor: "var(--bg-subtle)",
                          }}
                        >
                          {item.code}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          {item.location}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 align-middle">{item.category}</td>
                      <td className="font-mono-code px-4 py-3.5 text-right tabular-nums align-middle">
                        {item.totalStock}
                      </td>
                      <td
                        className="font-mono-code px-4 py-3.5 text-right font-semibold tabular-nums align-middle"
                        style={{
                          color:
                            item.availableStock === 0
                              ? "var(--status-err-fg)"
                              : "var(--status-ok-fg)",
                        }}
                      >
                        {item.availableStock}
                      </td>
                      <td className="font-mono-code px-4 py-3.5 text-right tabular-nums align-middle">
                        {status.borrowed}
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <StatusBadge tone={status.tone} label={status.label} />
                      </td>
                      <td className="px-4 py-3.5 text-right align-middle">
                        {isAdmin ? (
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              aria-label={`Edit ${item.name}`}
                              className="btn-surface inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-[6px] border px-3 text-xs font-semibold"
                            >
                              <IconEdit />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError(null);
                                setDeletingItem(item);
                              }}
                              aria-label={`Hapus ${item.name}`}
                              className="btn-danger-tint inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-[6px] border px-3 text-xs font-semibold"
                            >
                              <IconTrash />
                              <span>Hapus</span>
                            </button>
                          </div>
                        ) : item.availableStock > 0 ? (
                          <Link
                            href={`/peminjaman?itemId=${encodeURIComponent(item.id)}`}
                            className="btn-brand-tint inline-flex min-h-[44px] items-center whitespace-nowrap rounded-[6px] border px-3 text-xs font-semibold"
                          >
                            Pinjamkan
                          </Link>
                        ) : (
                          <span className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                            Stok Habis
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {filteredItems.map((item) => {
              const status = getItemAvailabilityInfo(item);
              return (
                <article
                  key={item.id}
                  className="rounded-[8px] border p-4 space-y-3"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span
                        className="font-mono-code inline-block rounded-[4px] border px-2 py-0.5 text-xs font-semibold"
                        style={{
                          borderColor: "var(--border-subtle)",
                          backgroundColor: "var(--bg-subtle)",
                        }}
                      >
                        {item.code}
                      </span>
                      <h2 className="mt-1.5 text-base font-bold">{item.name}</h2>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {item.category} · {item.location}
                      </p>
                    </div>
                    <StatusBadge tone={status.tone} label={status.label} />
                  </div>

                  <dl
                    className="grid grid-cols-3 gap-2 rounded-[6px] border p-2.5 text-center"
                    style={{
                      backgroundColor: "var(--bg-subtle)",
                      borderColor: "var(--border-subtle)",
                    }}
                  >
                    <div>
                      <dt className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                        Total
                      </dt>
                      <dd className="font-mono-code text-sm font-bold tabular-nums">
                        {item.totalStock}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                        Tersedia
                      </dt>
                      <dd className="font-mono-code text-sm font-bold tabular-nums">
                        {item.availableStock}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                        Dipinjam
                      </dt>
                      <dd className="font-mono-code text-sm font-bold tabular-nums">
                        {status.borrowed}
                      </dd>
                    </div>
                  </dl>

                  {isAdmin ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="btn-surface inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-[6px] border px-3 text-sm font-semibold"
                      >
                        <IconEdit />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setDeletingItem(item);
                        }}
                        className="btn-danger-tint inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-[6px] border px-3 text-sm font-semibold"
                      >
                        <IconTrash />
                        <span>Hapus</span>
                      </button>
                    </div>
                  ) : (
                    item.availableStock > 0 && (
                      <Link
                        href={`/peminjaman?itemId=${encodeURIComponent(item.id)}`}
                        className="btn-brand-tint inline-flex min-h-[44px] w-full items-center justify-center rounded-[6px] border px-3 text-sm font-semibold"
                      >
                        Catat Peminjaman Barang Ini
                      </Link>
                    )
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}

      <ModalDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingItem ? `Edit Barang (${editingItem.code})` : "Tambah Barang Baru"}
        description={
          editingItem
            ? "Perbarui rincian perangkat atau stok total inventaris."
            : "Tambahkan perangkat laboratorium baru ke dalam daftar inventaris."
        }
      >
        <form onSubmit={handleSaveItem} className="space-y-4" noValidate>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="item-code" className="mb-1.5 block text-sm font-semibold">
                Kode Barang
              </label>
              <input
                id="item-code"
                type="text"
                required
                value={formState.code}
                onChange={(e) => setFormState((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="Contoh: BR013"
                className="font-mono-code min-h-[44px] w-full rounded-[6px] border px-3 text-sm uppercase"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-control)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div>
              <label htmlFor="item-stock" className="mb-1.5 block text-sm font-semibold">
                Stok Total
              </label>
              <input
                id="item-stock"
                type="number"
                min={editingItem ? editingItem.totalStock - editingItem.availableStock : 0}
                step={1}
                required
                value={formState.totalStock}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, totalStock: e.target.value }))
                }
                className="font-mono-code min-h-[44px] w-full rounded-[6px] border px-3 text-sm"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-control)",
                  color: "var(--text-primary)",
                }}
              />
              {editingItem && editingItem.totalStock > editingItem.availableStock && (
                <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                  Minimal {editingItem.totalStock - editingItem.availableStock} unit karena sedang dipinjam.
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="item-name" className="mb-1.5 block text-sm font-semibold">
              Nama Barang
            </label>
            <input
              id="item-name"
              type="text"
              required
              value={formState.name}
              onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Contoh: Router MikroTik hEX"
              className="min-h-[44px] w-full rounded-[6px] border px-3 text-sm"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-control)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="item-category" className="mb-1.5 block text-sm font-semibold">
                Kategori
              </label>
              <select
                id="item-category"
                value={formState.category}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, category: e.target.value }))
                }
                className="min-h-[44px] w-full rounded-[6px] border px-3 text-sm"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-control)",
                  color: "var(--text-primary)",
                }}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="item-location" className="mb-1.5 block text-sm font-semibold">
                Lokasi Penyimpanan
              </label>
              <input
                id="item-location"
                type="text"
                value={formState.location}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, location: e.target.value }))
                }
                placeholder="Contoh: Rak Lab A1"
                className="min-h-[44px] w-full rounded-[6px] border px-3 text-sm"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-control)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="btn-surface min-h-[44px] rounded-[6px] border px-4 text-sm font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-accent min-h-[44px] rounded-[6px] px-4 text-sm font-semibold disabled:opacity-60"
            >
              {saving
                ? "Menyimpan..."
                : editingItem
                  ? "Simpan Perubahan"
                  : "Simpan Barang Baru"}
            </button>
          </div>
        </form>
      </ModalDialog>

      <ModalDialog
        open={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        title="Konfirmasi Hapus Barang"
        description={
          deletingItem
            ? `Anda akan menghapus ${deletingItem.code} - ${deletingItem.name} dari daftar inventaris.`
            : undefined
        }
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          {deleteError && (
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
              <span>{deleteError}</span>
            </div>
          )}

          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Data barang yang dihapus tidak dapat dipulihkan. Penghapusan ditolak otomatis apabila barang masih memiliki transaksi peminjaman aktif.
          </p>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setDeletingItem(null)}
              className="btn-surface min-h-[44px] rounded-[6px] border px-4 text-sm font-semibold"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="btn-danger-solid min-h-[44px] rounded-[6px] border px-4 text-sm font-semibold disabled:opacity-60"
            >
              {deleting ? "Menghapus..." : "Ya, Hapus Barang"}
            </button>
          </div>
        </div>
      </ModalDialog>
    </div>
  );
}

