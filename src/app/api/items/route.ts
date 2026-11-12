import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { requireApiUser } from "@/lib/auth";
import { getRepository } from "@/lib/db";
import { RepoError } from "@/lib/db/errors";

export async function GET(req: NextRequest) {
  try {
    await requireApiUser(["admin", "staff"]);
    const { searchParams } = req.nextUrl;
    const repo = getRepository();
    const items = await repo.listItems({
      query: searchParams.get("q") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      availability: searchParams.get("availability") ?? undefined,
    });
    return NextResponse.json({ items, storageBackend: repo.backendName });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireApiUser(["admin"]);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      throw new RepoError("Payload data barang tidak valid.", 400);
    }

    const repo = getRepository();
    const item = await repo.createItem(
      {
        code: String(body.code ?? ""),
        name: String(body.name ?? ""),
        category: String(body.category ?? ""),
        totalStock: Number(body.totalStock),
        location: typeof body.location === "string" ? body.location : undefined,
      },
      admin,
    );
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

