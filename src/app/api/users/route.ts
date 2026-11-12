import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { requireApiUser } from "@/lib/auth";
import { getRepository } from "@/lib/db";
import { RepoError } from "@/lib/db/errors";

export async function GET() {
  try {
    await requireApiUser(["admin"]);
    const repo = getRepository();
    const users = await repo.listUsers();
    return NextResponse.json({ users, storageBackend: repo.backendName });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireApiUser(["admin"]);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      throw new RepoError("Payload pengguna tidak valid.", 400);
    }

    const repo = getRepository();
    const user = await repo.createUser(
      {
        username: String(body.username ?? ""),
        fullName: String(body.fullName ?? ""),
        password: String(body.password ?? ""),
        role: body.role === "admin" ? "admin" : "staff",
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      },
      admin,
    );
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

