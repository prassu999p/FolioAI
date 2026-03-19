import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { CookieMethodsServer } from '@supabase/ssr'
import type { Database } from './types'

export async function createClient() {
  const cookieStore = await cookies()
  const cookieMethods: CookieMethodsServer = {
    getAll() { return cookieStore.getAll() },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      } catch {
        // Called from Server Component — cookie mutation is OK to ignore here
      }
    },
  }
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: cookieMethods }
  )
}
