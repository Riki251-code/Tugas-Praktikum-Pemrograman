import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { isSupabaseConfigured } from "./db";
import { AppUser } from "./types";

export async function requirePageUser(): Promise<{
  user: AppUser;
  storageBackend: "supabase" | "local_preview";
}> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return {
    user,
    storageBackend: isSupabaseConfigured() ? "supabase" : "local_preview",
  };
}

