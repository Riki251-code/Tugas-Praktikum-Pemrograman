import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { requireApiUser } from "@/lib/auth";
import { getRepository } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireApiUser(["admin", "staff"]);
    const repo = getRepository();
    const summary = await repo.getDashboardSummary(user);
    return NextResponse.json(summary);
  } catch (error) {
    return handleApiError(error);
  }
}

