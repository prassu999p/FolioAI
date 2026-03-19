/**
 * Grandfathering NAV Seed Script
 *
 * Fetches Jan 31, 2018 NAV data for all active AMFI scheme codes from mfapi.in
 * and upserts into the grandfathering_nav table.
 *
 * Run ONCE during Phase 1 setup:
 *   npm run seed:grandfathering
 *
 * Requirements:
 *   - NEXT_PUBLIC_SUPABASE_URL env var
 *   - SUPABASE_SERVICE_ROLE_KEY env var (bypasses RLS for this one-time seed)
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { join } from 'path'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MfapiScheme {
  schemeCode: number
  schemeName: string
}

interface MfapiNavEntry {
  date: string  // "DD-MM-YYYY"
  nav: string   // string decimal
}

interface MfapiNavResponse {
  meta: { scheme_code: number; scheme_name: string }
  data: MfapiNavEntry[]
  status: string
}

interface GrandfatheringNavInsert {
  scheme_code: number
  nav: number
  nav_date: string  // ISO "YYYY-MM-DD"
}

interface FailedScheme {
  scheme_code: number
  reason: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing required env vars:')
  if (!SUPABASE_URL) console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  if (!SERVICE_ROLE_KEY) console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const BATCH_SIZE = 10
const BATCH_DELAY_MS = 200
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

// Grandfathering date — Jan 31, 2018 per LTCG tax rules (Budget 2018)
const GRANDFATHER_DATE = '2018-01-31'
// Fetch window: Jan 31 – Feb 07 2018 to handle market holidays near Jan 31
const FETCH_START = '01-01-2018'  // mfapi uses DD-MM-YYYY
const FETCH_END = '07-02-2018'

// ─── Supabase client (service role — bypasses RLS) ────────────────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Parse mfapi DD-MM-YYYY date string to ISO YYYY-MM-DD
 */
function parseNavDate(ddmmyyyy: string): string {
  const [dd, mm, yyyy] = ddmmyyyy.split('-')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Fetch with retry-3 logic
 */
async function fetchWithRetry(url: string, attempt = 1): Promise<Response> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS * attempt)
      return fetchWithRetry(url, attempt + 1)
    }
    throw err
  }
}

/**
 * Find the closest NAV on or after Jan 31, 2018.
 * mfapi returns data in reverse chronological order (latest first).
 * We want the earliest date on or after Jan 31 (i.e., the last entry in the array
 * that falls within our window).
 */
function findGrandfatheringNav(data: MfapiNavEntry[]): GrandfatheringNavInsert | null {
  if (!data || data.length === 0) return null

  // Convert all entries to { isoDate, nav } and filter to on/after Jan 31 2018
  const entries = data
    .map((entry) => ({ isoDate: parseNavDate(entry.date), nav: parseFloat(entry.nav) }))
    .filter((entry) => entry.isoDate >= GRANDFATHER_DATE)
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate)) // ascending: earliest first

  if (entries.length === 0) return null

  // Use the earliest available date on or after Jan 31 (first entry after sort)
  const picked = entries[0]
  if (isNaN(picked.nav) || picked.nav <= 0) return null

  return { scheme_code: 0, nav: picked.nav, nav_date: picked.isoDate }
}

/**
 * Fetch NAV data for a single scheme code near Jan 31, 2018
 */
async function fetchSchemeNav(schemeCode: number): Promise<GrandfatheringNavInsert | null> {
  const url = `https://api.mfapi.in/mf/${schemeCode}?startDate=${FETCH_START}&endDate=${FETCH_END}`
  try {
    const res = await fetchWithRetry(url)
    const json: MfapiNavResponse = await res.json()

    if (!json.data || json.data.length === 0) {
      // Scheme launched after Jan 31, 2018 — expected, not an error
      return null
    }

    const navEntry = findGrandfatheringNav(json.data)
    if (!navEntry) return null

    navEntry.scheme_code = schemeCode
    return navEntry
  } catch (_err) {
    throw new Error(`Fetch failed for scheme ${schemeCode}: ${(_err as Error).message}`)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Grandfathering NAV Seed ===')
  console.log(`Target date: ${GRANDFATHER_DATE} (Jan 31, 2018 — LTCG grandfathering date)`)
  console.log('')

  // Step 1: Fetch all active scheme codes from mfapi.in
  console.log('Fetching scheme list from mfapi.in...')
  const schemeListRes = await fetchWithRetry('https://api.mfapi.in/mf')
  const schemes: MfapiScheme[] = await schemeListRes.json()
  console.log(`Found ${schemes.length} active schemes`)

  if (schemes.length === 0) {
    console.error('ERROR: No schemes returned from mfapi.in. Aborting.')
    process.exit(1)
  }

  // Step 2: Process in batches with rate-limit delay
  const toInsert: GrandfatheringNavInsert[] = []
  const failedSchemes: FailedScheme[] = []
  let processed = 0

  for (let i = 0; i < schemes.length; i += BATCH_SIZE) {
    const batch = schemes.slice(i, i + BATCH_SIZE)

    const batchResults = await Promise.allSettled(
      batch.map((s) => fetchSchemeNav(s.schemeCode))
    )

    for (let j = 0; j < batch.length; j++) {
      const result = batchResults[j]
      const schemeCode = batch[j].schemeCode

      if (result.status === 'fulfilled' && result.value !== null) {
        toInsert.push(result.value)
      } else if (result.status === 'rejected') {
        failedSchemes.push({ scheme_code: schemeCode, reason: result.reason?.message ?? 'Unknown' })
      }
      // null means scheme launched after 2018 — silently skip
    }

    processed += batch.length
    if (processed % 500 === 0 || i + BATCH_SIZE >= schemes.length) {
      const pct = ((processed / schemes.length) * 100).toFixed(1)
      console.log(`Progress: ${processed}/${schemes.length} (${pct}%) — ${toInsert.length} NAVs found, ${failedSchemes.length} errors`)
    }

    // Rate limit delay between batches
    if (i + BATCH_SIZE < schemes.length) {
      await sleep(BATCH_DELAY_MS)
    }
  }

  console.log('')
  console.log(`Fetched ${toInsert.length} grandfathering NAV records`)

  // Step 3: Write failed schemes to file for manual review
  if (failedSchemes.length > 0) {
    const failedPath = join(process.cwd(), 'scripts', 'failed-schemes.json')
    writeFileSync(failedPath, JSON.stringify(failedSchemes, null, 2))
    console.warn(`WARNING: ${failedSchemes.length} schemes failed to fetch. Written to scripts/failed-schemes.json`)
  }

  // Step 4: Upsert into grandfathering_nav (service role bypasses RLS)
  if (toInsert.length === 0) {
    console.error('ERROR: No NAV records to insert. Possible mfapi.in outage.')
    process.exit(1)
  }

  console.log('Upserting into grandfathering_nav...')

  // Insert in chunks of 1000 to stay within request limits
  const INSERT_CHUNK = 1000
  let insertedTotal = 0

  for (let i = 0; i < toInsert.length; i += INSERT_CHUNK) {
    const chunk = toInsert.slice(i, i + INSERT_CHUNK)
    const { error } = await supabase
      .from('grandfathering_nav')
      .upsert(chunk, { onConflict: 'scheme_code' })

    if (error) {
      console.error(`ERROR during upsert chunk ${i}–${i + chunk.length}:`, error.message)
      process.exit(1)
    }
    insertedTotal += chunk.length
  }

  console.log(`Upserted ${insertedTotal} records`)

  // Step 5: Completeness check
  const { count, error: countError } = await supabase
    .from('grandfathering_nav')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('ERROR during count check:', countError.message)
    process.exit(1)
  }

  console.log('')
  console.log(`=== COMPLETE ===`)
  console.log(`Seeded ${count} grandfathering NAV records`)

  if (count !== null && count < 5000) {
    console.warn('WARNING: Expected 5000+ records. Check scripts/failed-schemes.json and mfapi.in availability.')
    process.exit(1)
  }

  console.log('Seed completed successfully.')
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
