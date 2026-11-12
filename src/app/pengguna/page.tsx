import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PenggunaClient } from "@/components/PenggunaClient";
import { IconAlert } from "@/components/icons";
import { getRepository } from "@/lib/db";
import { requirePageUser } from "@/lib/server-page";

export const metadata: Metadata = {
  title: "Manajemen Pengguna",
};

export const dynamic = "force-dynamic";

export default async function PenggunaPage() {
  const { user, storageBackend } = await requirePageUser();

  if (user.role !== "admin") {
    return (
      <AppShell user={user} storageBackend={storageBackend}>
        <section
          className="mx-auto max-w-lg rounded-[8px] border p-6 text-center space-y-3"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <div
            className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-[6px]"
            style={{
              backgroundColor: "var(--status-err-bg)",
              color: "var(--status-err-fg)",
            }}
          >
            <IconAlert width={20} height={20} />
          </div>
          <h1 className="text-xl font-bold">Akses Ditolak (Khusus Admin)</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Akun Staff tidak memiliki izin untuk membuka manajemen pengguna atau pengaturan Admin.
          </p>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-[6px] px-4 text-sm font-semibold"
            style={{
              backgroundColor: "var(--brand-primary)",
              color: "var(--brand-fg)",
            }}
          >
            Kembali ke Dashboard
          </Link>
        </section>
      </AppShell>
    );
  }

  const repo = getRepository();
  const users = await repo.listUsers();

  return (
    <AppShell user={user} storageBackend={storageBackend}>
      <PenggunaClient currentUser={user} initialUsers={users} />
    </AppShell>
  );
}

