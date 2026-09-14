import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export const MISSING_SUPABASE_ENV_MESSAGE =
  "Kingdom Query: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars.";

/**
 * Lazily-created browser Supabase client. Kingdom Query is a fully static
 * export (see next.config.ts `output: "export"`), so all data access happens
 * client-side against Supabase directly, gated by RLS policies rather than
 * Next.js server routes.
 */
export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(MISSING_SUPABASE_ENV_MESSAGE);
  }

  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return client;
}
