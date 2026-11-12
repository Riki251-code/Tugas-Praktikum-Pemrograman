import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getRepository } from "./db";
import { RepoError } from "./db/errors";
import { AppUser, UserRole } from "./types";

const SESSION_COOKIE_NAME = "labtrack_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

interface SessionPayload {
  uid: string;
  role: UserRole;
  exp: number;
}

function getSigningSecret(): string {
  const envSecret = process.env.AUTH_SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }
  // Fall back to a deterministic process secret in local dev so restarts keep sessions valid.
  return crypto
    .createHash("sha256")
    .update(`labtrack-dev-${process.cwd()}-${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "local"}`)
    .digest("hex");
}

function signPayload(payload: SessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSigningSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyToken(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", getSigningSecret())
    .update(encoded)
    .digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8")) as SessionPayload;
    if (!parsed.uid || !parsed.exp || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isHttpsRequest(req?: NextRequest): boolean {
  if (!req) return process.env.NODE_ENV === "production";
  const forwarded = req.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";
  return req.nextUrl.protocol === "https:";
}

export async function createSessionCookie(
  response: NextResponse,
  user: AppUser,
  req?: NextRequest,
): Promise<void> {
  const token = signPayload({
    uid: user.id,
    role: user.role,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  });

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttpsRequest(req),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse, req?: NextRequest): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttpsRequest(req),
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  const payload = verifyToken(raw);
  if (!payload) return null;

  try {
    const repo = getRepository();
    const user = await repo.findUserById(payload.uid);
    if (!user || !user.isActive) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

export async function requireApiUser(allowedRoles?: UserRole[]): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new RepoError("Sesi login tidak valid atau telah berakhir. Silakan login kembali.", 401);
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new RepoError("Anda tidak memiliki hak akses untuk tindakan ini.", 403);
  }
  return user;
}
