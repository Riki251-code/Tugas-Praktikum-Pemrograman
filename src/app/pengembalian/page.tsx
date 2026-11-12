import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { PengembalianClient } from "@/components/PengembalianClient";
import { getRepository } from "@/lib/db";
import { requirePageUser } from "@/lib/server-page";

export const metadata: Metadata = {
  title: "Pengembalian & Riwayat",
};

export const dynamic = "force-dynamic";

export default async function PengembalianPage({
  searchParams,
}: {
  searchParams: Promise<{ trx?: string }>;
}) {
  const { user, storageBackend } = await requirePageUser();
  const params = await searchParams;
  const repo = getRepository();
  const borrowings = await repo.listBorrowings();

  return (
    <AppShell user={user} storageBackend={storageBackend}>
      <PengembalianClient
        user={user}
        initialBorrowings={borrowings}
        initialSearch={params.trx ?? ""}
      />
    </AppShell>
  );
}

