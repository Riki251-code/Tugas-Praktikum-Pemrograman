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
      throw new RepoError("Payload pembaruan pengguna tidak valid.", 400);
    }

    const repo = getRepository();
    const user = await repo.updateUser(
      id,
      {
        username: body.username !== undefined ? String(body.username) : undefined,
        fullName: body.fullName !== undefined ? String(body.fullName) : undefined,
        password: body.password !== undefined ? String(body.password) : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      },
      admin,
    );
    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

