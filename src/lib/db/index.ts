import { RepoError } from "./errors";
import { LocalDevRepository } from "./local-repo";
import { LabRepository } from "./repo-interface";
import { SupabaseRepository } from "./supabase-repo";

let cachedLocalRepo: LocalDevRepository | null = null;
let cachedSupabaseRepo: SupabaseRepository | null = null;

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key);
}

export function getRepository(): LabRepository {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (supabaseUrl && (serviceRoleKey || anonKey)) {
    if (!cachedSupabaseRepo) {
      cachedSupabaseRepo = new SupabaseRepository(supabaseUrl, (serviceRoleKey || anonKey)!);
    }
    return cachedSupabaseRepo;
  }

  // Serverless platforms reset local files across requests, so require Supabase there.
  if (process.env.VERCEL === "1" || process.env.NETLIFY === "true") {
    throw new RepoError(
      "Konfigurasi Supabase belum diatur pada hosting. Tambahkan NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di Environment Variables.",
      503,
    );
  }

  if (!cachedLocalRepo) {
    cachedLocalRepo = new LocalDevRepository();
  }
  return cachedLocalRepo;
}

