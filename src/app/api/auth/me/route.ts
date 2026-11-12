import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { requireApiUser } from "@/lib/auth";
import { getRepository } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireApiUser();
    const repo = getRepository();
    return NextResponse.json({ user, storageBackend: repo.backendName });
  } catch (error) {
    return handleApiError(error);
  }
}

