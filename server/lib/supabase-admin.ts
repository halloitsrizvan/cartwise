// Service-role client. SERVER ONLY: never import from client code.
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

let admin: ReturnType<typeof createClient> | null = null;
export function supabaseAdmin() {
  admin ??= createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return admin;
}
