import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/DashboardClient";
import { getRepository } from "@/lib/db";
import { requirePageUser } from "@/lib/server-page";

export const metadata: Metadata = {
  title: "Ringkasan",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user, storageBackend } = await requirePageUser();
  const repo = getRepository();
  const summary = await repo.getDashboardSummary(user);

  return (
    <AppShell user={user} storageBackend={storageBackend}>
      <DashboardClient user={user} initialSummary={summary} />
    </AppShell>
  );
}

