import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response, req);
  return response;
}
