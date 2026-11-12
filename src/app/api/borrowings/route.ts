import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { requireApiUser } from "@/lib/auth";
import { getRepository } from "@/lib/db";
import { RepoError } from "@/lib/db/errors";

export async function GET(req: NextRequest) {
  try {
    const user = await requireApiUser(["admin", "staff"]);
    const { searchParams } = req.nextUrl;
    const mineOnly = searchParams.get("scope") === "mine" && user.role === "staff";
    const repo = getRepository();
    const borrowings = await repo.listBorrowings({
      status: searchParams.get("status") ?? undefined,
      query: searchParams.get("q") ?? undefined,
      onlyActorId: mineOnly ? user.id : undefined,
    });
    return NextResponse.json({ borrowings, storageBackend: repo.backendName });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiUser(["admin", "staff"]);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      throw new RepoError("Payload peminjaman tidak valid.", 400);
    }

    const repo = getRepository();
    const borrowing = await repo.createBorrowing(
      {
        borrowerName: String(body.borrowerName ?? ""),
        itemId: String(body.itemId ?? ""),
        quantity: Number(body.quantity),
        borrowDate: String(body.borrowDate ?? ""),
        notes: typeof body.notes === "string" ? body.notes : undefined,
      },
      user,
    );
    return NextResponse.json({ borrowing }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

