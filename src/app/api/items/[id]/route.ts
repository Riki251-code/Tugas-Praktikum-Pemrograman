import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { requireApiUser } from "@/lib/auth";
import { getRepository } from "@/lib/db";
import { RepoError } from "@/lib/db/errors";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireApiUser(["admin"]);
    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      throw new RepoError("Payload pembaruan barang tidak valid.", 400);
    }

    const repo = getRepository();
    const item = await repo.updateItem(
      id,
      {
        code: body.code !== undefined ? String(body.code) : undefined,
        name: body.name !== undefined ? String(body.name) : undefined,
        category: body.category !== undefined ? String(body.category) : undefined,
        totalStock: body.totalStock !== undefined ? Number(body.totalStock) : undefined,
        location: body.location !== undefined ? String(body.location) : undefined,
      },
      admin,
    );
    return NextResponse.json({ item });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireApiUser(["admin"]);
    const { id } = await context.params;
    const repo = getRepository();
    await repo.deleteItem(id, admin);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

