import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-response";
import { requireApiUser } from "@/lib/auth";
import { getRepository } from "@/lib/db";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireApiUser(["admin", "staff"]);
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const today = new Date().toISOString().slice(0, 10);

    const repo = getRepository();
    const borrowing = await repo.returnBorrowing(
      {
        borrowingId: id,
        returnDate: typeof body?.returnDate === "string" && body.returnDate ? body.returnDate : today,
        returnNotes: typeof body?.returnNotes === "string" ? body.returnNotes : "",
      },
      user,
    );
    return NextResponse.json({ borrowing });
  } catch (error) {
    return handleApiError(error);
  }
}

