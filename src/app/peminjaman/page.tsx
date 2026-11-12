import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { PeminjamanClient } from "@/components/PeminjamanClient";
import { getRepository } from "@/lib/db";
import { requirePageUser } from "@/lib/server-page";

export const metadata: Metadata = {
  title: "Peminjaman Barang",
};

export const dynamic = "force-dynamic";

export default async function PeminjamanPage({
  searchParams,
}: {
  searchParams: Promise<{ itemId?: string }>;
}) {
  const { user, storageBackend } = await requirePageUser();
  const params = await searchParams;
  const repo = getRepository();
  const [items, borrowings] = await Promise.all([
    repo.listItems(),
    repo.listBorrowings(),
  ]);

  return (
    <AppShell user={user} storageBackend={storageBackend}>
      <PeminjamanClient
        initialItems={items}
        initialBorrowings={borrowings}
        preselectedItemId={params.itemId}
      />
    </AppShell>
  );
}

