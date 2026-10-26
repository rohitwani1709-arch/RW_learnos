import { createBrowserClient } from "@supabase/ssr";
import { requireEnv } from "@/lib/env";

export function createClient() {
  const e = requireEnv();
  return createBrowserClient(e.NEXT_PUBLIC_SUPABASE_URL, e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
