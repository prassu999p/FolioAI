import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BATCH_SIZE = 10
const BATCH_DELAY_MS = 100

async function fetchNavWithRetry(
  schemeCode: number,
  attempt = 1
): Promise<{ date: string; nav: number }> {
  try {
    const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}/latest`, {
      signal: AbortSignal.timeout(10000),  // 10s per request
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const entry = data?.data?.[0]
    if (!entry?.date || !entry?.nav) throw new Error('Unexpected mfapi.in response shape')
    // mfapi.in returns dates as "19-03-2026" — convert to ISO "2026-03-19"
    const parts = entry.date.split('-')
    if (parts.length !== 3) throw new Error(`Unknown date format: ${entry.date}`)
    const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`
    return { date: isoDate, nav: parseFloat(entry.nav) }
  } catch (err) {
    if (attempt >= 3) throw err
    await new Promise(r => setTimeout(r, 1000 * attempt))
    return fetchNavWithRetry(schemeCode, attempt + 1)
  }
}

export async function POST(_request: Request) {
  const supabase = await createClient()
  const result = await supabase.auth.getClaims()
  const claims = result.data?.claims ?? null
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get user's family
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: family } = await (supabase.from('families') as any)
    .select('id')
    .eq('user_id', claims.sub)
    .single() as { data: { id: string } | null }
  if (!family) return NextResponse.json({ error: 'Family not found' }, { status: 404 })

  // Get all distinct scheme codes held by any holder in this family
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: folioData } = await (supabase.from('folios') as any)
    .select('scheme_code, holders!inner(family_id)')
    .eq('holders.family_id', family.id) as { data: Array<{ scheme_code: number }> | null }

  if (!folioData || folioData.length === 0) {
    return NextResponse.json({ synced: 0, failed: 0, schemes_failed: [] })
  }

  const schemeCodes = [...new Set(folioData.map((f: { scheme_code: number }) => f.scheme_code))]
  const today = new Date().toISOString().split('T')[0]

  // Filter out scheme codes already synced today
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: alreadySynced } = await (supabase.from('nav_prices') as any)
    .select('scheme_code')
    .in('scheme_code', schemeCodes)
    .eq('nav_date', today) as { data: Array<{ scheme_code: number }> | null }

  const syncedToday = new Set((alreadySynced ?? []).map((n: { scheme_code: number }) => n.scheme_code))
  const toSync = schemeCodes.filter(sc => !syncedToday.has(sc))

  const results = { synced: 0, failed: 0, schemes_failed: [] as number[] }

  // Process in batches
  for (let i = 0; i < toSync.length; i += BATCH_SIZE) {
    const batch = toSync.slice(i, i + BATCH_SIZE)

    await Promise.allSettled(
      batch.map(async (schemeCode) => {
        try {
          const { date, nav } = await fetchNavWithRetry(schemeCode)
          const navPriceInsert = { scheme_code: schemeCode, nav, nav_date: date }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('nav_prices') as any).upsert(
            navPriceInsert,
            { onConflict: 'scheme_code,nav_date', ignoreDuplicates: false }
          )
          results.synced++
        } catch {
          results.failed++
          results.schemes_failed.push(schemeCode)
        }
      })
    )

    // Rate protection: delay between batches (except last batch)
    if (i + BATCH_SIZE < toSync.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS))
    }
  }

  return NextResponse.json({
    synced: results.synced + syncedToday.size,
    failed: results.failed,
    schemes_failed: results.schemes_failed,
    already_current: syncedToday.size,
  })
}
