import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { createSessionCookie } from "@/lib/auth";
import { getRepository } from "@/lib/db";
import { RepoError } from "@/lib/db/errors";
import { verifyPassword } from "@/lib/password";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!username || !password) {
      throw new RepoError("Username dan password wajib diisi.", 400);
    }

    const repo = getRepository();
    const userRecord = await repo.findUserByUsername(username);
    if (!userRecord || !verifyPassword(password, userRecord.passwordHash)) {
      throw new RepoError("Username atau password tidak sesuai.", 401);
    }

    if (!userRecord.isActive) {
      throw new RepoError(
        "Akun Anda sedang dinonaktifkan oleh Admin. Hubungi kepala laboratorium untuk mengaktifkan kembali.",
        403,
      );
    }

    const { passwordHash: _ignored, ...safeUser } = userRecord;
    const response = NextResponse.json({
      user: safeUser,
      storageBackend: repo.backendName,
    });
    await createSessionCookie(response, safeUser, req);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
