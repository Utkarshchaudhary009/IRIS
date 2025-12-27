import { useSession } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";

export function createSupabaseClient() {
  const { session } = useSession()
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_KEY!,
    {
      async accessToken() {
        return session?.getToken() ?? null
      },
    }
  );
}
