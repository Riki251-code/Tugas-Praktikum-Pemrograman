"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";
import { AppUser } from "@/lib/types";
import {
  IconBorrowOut,
  IconBox,
  IconClose,
  IconLogout,
  IconMenu,
  IconOverview,
  IconReturnIn,
  IconUsers,
} from "./icons";
import { StatusBadge } from "./StatusBadge";
import { ThemeToggle } from "./ThemeToggle";

interface AppShellProps {
  user: AppUser;
  storageBackend: "supabase" | "local_preview";
  children: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  mobileLabel: string;
  icon: "overview" | "items" | "borrow" | "return" | "users";
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Ringkasan", mobileLabel: "Ringkas", icon: "overview" },
  { href: "/inventaris", label: "Inventaris Barang", mobileLabel: "Barang", icon: "items" },
  { href: "/peminjaman", label: "Peminjaman", mobileLabel: "Pinjam", icon: "borrow" },
  {
    href: "/pengembalian",
    label: "Pengembalian & Riwayat",
    mobileLabel: "Kembali",
    icon: "return",
  },
  {
    href: "/pengguna",
    label: "Manajemen Pengguna",
    mobileLabel: "Akun",
    icon: "users",
    adminOnly: true,
  },
];

function renderNavIcon(icon: NavItem["icon"]) {
  switch (icon) {
    case "overview":
      return <IconOverview className="shrink-0" />;
    case "items":
      return <IconBox className="shrink-0" />;
    case "borrow":
      return <IconBorrowOut className="shrink-0" />;
    case "return":
      return <IconReturnIn className="shrink-0" />;
    case "users":
      return <IconUsers className="shrink-0" />;
  }
}

export function AppShell({ user, storageBackend, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const allowedItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || user.role === "admin",
  );

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main-content" className="skip-link">
        Lewati ke konten utama
      </a>

      <header
        className="border-b"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex shrink-0 items-center gap-2.5 whitespace-nowrap">
            <Link
              href="/"
              className="inline-flex min-h-[44px] shrink-0 items-center gap-2.5 rounded-[6px] px-1.5 font-bold tracking-tight whitespace-nowrap"
              style={{ color: "var(--text-primary)" }}
            >
              <span
                className="font-mono-code rounded-[4px] px-2 py-1 text-xs font-semibold uppercase tracking-wider"
                style={{
                  backgroundColor: "var(--brand-primary)",
                  color: "var(--brand-fg)",
                }}
              >
                LAB
              </span>
              <span className="text-base sm:text-lg">LabTrack</span>
            </Link>
            <StatusBadge
              tone={user.role === "admin" ? "warn" : "ok"}
              label={user.role === "admin" ? "ADMIN" : "STAFF"}
              withIcon={false}
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden md:block max-w-[220px] text-right pr-1.5">
              <p
                className="truncate text-sm font-semibold leading-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {user.fullName}
              </p>
              <p
                className="font-mono-code truncate text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                @{user.username}
              </p>
            </div>

            <ThemeToggle />

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="btn-surface hidden md:inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-[6px] border px-3 text-sm font-medium disabled:opacity-60"
            >
              <IconLogout className="shrink-0" />
              <span>{loggingOut ? "Keluar..." : "Keluar"}</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-drawer"
              aria-label={mobileMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
              className="btn-subtle inline-flex md:hidden min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[6px] border px-3 text-sm font-semibold"
            >
              {mobileMenuOpen ? <IconClose className="shrink-0" /> : <IconMenu className="shrink-0" />}
              <span>Menu</span>
            </button>
          </div>
        </div>

        <nav
          aria-label="Navigasi utama"
          className="hidden md:block border-t"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-1.5 px-4 py-1.5 sm:px-6">
            {allowedItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-[6px] border px-3 py-2 text-sm transition-colors ${
                    active ? "" : "nav-link-inactive border-transparent font-medium"
                  }`}
                  style={
                    active
                      ? {
                          backgroundColor: "var(--brand-tint)",
                          borderColor: "var(--brand-primary)",
                          color: "var(--brand-primary)",
                          fontWeight: 600,
                        }
                      : undefined
                  }
                >
                  {renderNavIcon(item.icon)}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {mobileMenuOpen && (
          <div
            id="mobile-nav-drawer"
            className="md:hidden border-t px-4 py-4"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div
              className="mb-3 flex items-center justify-between gap-2 rounded-[6px] border px-3 py-2.5"
              style={{
                borderColor: "var(--border-subtle)",
                backgroundColor: "var(--bg-subtle)",
              }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.fullName}</p>
                <p className="font-mono-code truncate text-xs" style={{ color: "var(--text-secondary)" }}>
                  @{user.username} ({user.role.toUpperCase()})
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="btn-surface inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-[6px] border px-3 text-sm font-semibold disabled:opacity-60"
              >
                <IconLogout className="shrink-0" />
                <span>{loggingOut ? "Keluar..." : "Keluar"}</span>
              </button>
            </div>

            <nav aria-label="Menu navigasi seluler" className="grid gap-1.5 sm:grid-cols-2">
              {allowedItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-[44px] items-center gap-2.5 rounded-[6px] border px-3 py-2 text-sm font-medium ${
                      active ? "" : "btn-surface"
                    }`}
                    style={
                      active
                        ? {
                            backgroundColor: "var(--brand-tint)",
                            borderColor: "var(--brand-primary)",
                            color: "var(--brand-primary)",
                            fontWeight: 600,
                          }
                        : {
                            borderColor: "var(--border-subtle)",
                          }
                    }
                  >
                    {renderNavIcon(item.icon)}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8"
      >
        {children}
      </main>

      <footer
        className="border-t px-4 py-4 pb-24 text-xs md:pb-4"
        style={{
          borderColor: "var(--border-subtle)",
          backgroundColor: "var(--bg-surface)",
          color: "var(--text-secondary)",
        }}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p>
            LabTrack - Sistem Inventaris &amp; Peminjaman Laboratorium Komputer
          </p>
          <p>
            {storageBackend === "supabase"
              ? "Basis Data: Supabase PostgreSQL (Persistensi Online)"
              : "Mode Pratinjau Lokal (.local-data) - Siap dihubungkan ke Supabase untuk hosting publik"}
          </p>
        </div>
      </footer>

      <nav
        aria-label="Navigasi cepat bawah"
        className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t px-1.5 py-1.5"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-subtle)",
          paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))",
        }}
      >
        <div
          className={`grid gap-1 ${
            allowedItems.length === 5 ? "grid-cols-5" : "grid-cols-4"
          }`}
        >
          {allowedItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-[6px] px-1 py-1 text-[11px] font-medium"
                style={
                  active
                    ? {
                        backgroundColor: "var(--brand-tint)",
                        color: "var(--brand-primary)",
                        fontWeight: 600,
                      }
                    : {
                        color: "var(--text-secondary)",
                      }
                }
              >
                {renderNavIcon(item.icon)}
                <span className="truncate max-w-full">{item.mobileLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
