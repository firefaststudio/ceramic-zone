// lib/server/auth.ts
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/auth-helpers-nextjs';

export function getSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key: string) => cookieStore.get(key)?.value,
      },
    }
  );
}
