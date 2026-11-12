import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { InventarisClient } from "@/components/InventarisClient";
import { getRepository } from "@/lib/db";
import { requirePageUser } from "@/lib/server-page";

export const metadata: Metadata = {
  title: "Inventaris Barang",
};

export const dynamic = "force-dynamic";

export default async function InventarisPage() {
  const { user, storageBackend } = await requirePageUser();
  const repo = getRepository();
  const items = await repo.listItems();

  return (
    <AppShell user={user} storageBackend={storageBackend}>
      <InventarisClient user={user} initialItems={items} />
    </AppShell>
  );
}

