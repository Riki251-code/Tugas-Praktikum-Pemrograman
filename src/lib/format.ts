import { BadgeTone, InventoryItem } from "./types";

export function formatDateId(isoOrDate: string | null | undefined): string {
  if (!isoOrDate) return "-";
  const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(isoOrDate);
  const date = dateOnlyMatch ? new Date(`${isoOrDate}T00:00:00`) : new Date(isoOrDate);
  if (Number.isNaN(date.getTime())) return isoOrDate;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTimeId(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getTodayInputDate(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function getItemAvailabilityInfo(item: InventoryItem): {
  label: string;
  tone: BadgeTone;
  borrowed: number;
} {
  const borrowed = Math.max(0, item.totalStock - item.availableStock);
  if (item.availableStock === 0) {
    return { label: "Habis", tone: "err", borrowed };
  }
  if (item.availableStock < item.totalStock) {
    return { label: "Sebagian Dipinjam", tone: "warn", borrowed };
  }
  return { label: "Tersedia", tone: "ok", borrowed };
}
