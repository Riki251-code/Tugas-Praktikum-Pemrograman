import { NextResponse } from "next/server";
import { RepoError } from "./db/errors";

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof RepoError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message =
    error instanceof Error ? error.message : "Terjadi kesalahan pada server.";
  return NextResponse.json({ error: message }, { status: 500 });
}

