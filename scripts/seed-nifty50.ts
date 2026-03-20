/**
 * Nifty 50 Daily Data Seed Script
 *
 * Seeds historical Nifty 50 closing values from a niftyindices.com CSV file
 * into the nifty50_daily table for benchmark XIRR comparison.
 *
 * DOWNLOAD INSTRUCTIONS:
 *   1. Go to https://www.niftyindices.com/indices/equity/broad-based-indices/nifty-50
 *   2. Click "Download" on the "Historical Data" tab
 *   3. Set date range (e.g., 01-01-2000 to today)
 *   4. Export as CSV — it downloads as "ind_close_all_<date>.csv" or similar
 *   Note: The CSV uses "Date" and "Close" column headers
 *
 * USAGE:
 *   npm run seed:nifty50 -- ./nifty50_data.csv
 *   npx tsx scripts/seed-nifty50.ts ./nifty50_data.csv
 *
 * REQUIREMENTS:
 *   - NEXT_PUBLIC_SUPABASE_URL env var
 *   - SUPABASE_SERVICE_ROLE_KEY env var (bypasses RLS for bulk insert)
 *
 * BENCHMARK LOOKUP PATTERN (for server-side analytics code):
 *   -- Nearest-date lookup handles trading holidays:
 *   SELECT close FROM nifty50_daily WHERE nav_date <= $date ORDER BY nav_date DESC LIMIT 1
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Nifty50Row {
  nav_date: string  // YYYY-MM-DD
  close: number
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

const BATCH_SIZE = 500

// ─── Supabase client (service role — bypasses RLS) ────────────────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalize date string to YYYY-MM-DD.
 * Handles two common niftyindices.com formats:
 *   - DD-MM-YYYY  (e.g., "01-01-2024")
 *   - MM/DD/YYYY  (e.g., "01/01/2024")
 */
function normalizeDate(raw: string): string | null {
  const trimmed = raw.trim()

  // DD-MM-YYYY
  const ddmmyyyy = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy
    return `${yyyy}-${mm}-${dd}`
  }

  // MM/DD/YYYY
  const mmddyyyy = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (mmddyyyy) {
    const [, mm, dd, yyyy] = mmddyyyy
    return `${yyyy}-${mm}-${dd}`
  }

  return null
}

/**
 * Strip commas from numeric strings and parse to float.
 * e.g., "22,450.75" → 22450.75
 */
function parseClose(raw: string): number | null {
  const stripped = raw.trim().replace(/,/g, '')
  const value = parseFloat(stripped)
  return isNaN(value) ? null : value
}

/**
 * Parse niftyindices.com CSV file.
 * Expected columns: "Date" and "Close" (case-insensitive header match).
 */
function parseCsv(filePath: string): Nifty50Row[] {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length < 2) {
    console.error('ERROR: CSV file has fewer than 2 lines (header + data required)')
    process.exit(1)
  }

  // Parse header to find column indices
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''))
  const dateIdx = header.indexOf('date')
  const closeIdx = header.indexOf('close')

  if (dateIdx === -1) {
    console.error(`ERROR: "Date" column not found. Found columns: ${header.join(', ')}`)
    process.exit(1)
  }
  if (closeIdx === -1) {
    console.error(`ERROR: "Close" column not found. Found columns: ${header.join(', ')}`)
    process.exit(1)
  }

  const rows: Nifty50Row[] = []
  let skipped = 0

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/"/g, ''))

    if (cols.length <= Math.max(dateIdx, closeIdx)) {
      skipped++
      continue
    }

    const navDate = normalizeDate(cols[dateIdx])
    const close = parseClose(cols[closeIdx])

    if (!navDate || close === null || close <= 0) {
      skipped++
      continue
    }

    rows.push({ nav_date: navDate, close })
  }

  if (skipped > 0) {
    console.warn(`WARNING: Skipped ${skipped} unparseable rows`)
  }

  return rows
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = process.argv[2]

  if (!csvPath) {
    console.error('ERROR: CSV file path required as first argument')
    console.error('')
    console.error('USAGE:')
    console.error('  npm run seed:nifty50 -- ./nifty50_data.csv')
    console.error('  npx tsx scripts/seed-nifty50.ts ./nifty50_data.csv')
    console.error('')
    console.error('DOWNLOAD SOURCE:')
    console.error('  https://www.niftyindices.com/indices/equity/broad-based-indices/nifty-50')
    console.error('  → Historical Data → Download → Export as CSV')
    process.exit(1)
  }

  console.log('=== Nifty 50 Daily Seed ===')
  console.log(`CSV file: ${csvPath}`)
  console.log('')

  // Step 1: Parse CSV
  console.log('Parsing CSV...')
  const rows = parseCsv(csvPath)

  if (rows.length === 0) {
    console.error('ERROR: No valid rows parsed from CSV. Check file format.')
    process.exit(1)
  }

  const dates = rows.map((r) => r.nav_date).sort()
  const earliest = dates[0]
  const latest = dates[dates.length - 1]
  console.log(`Parsed ${rows.length} rows. Earliest: ${earliest}. Latest: ${latest}.`)
  console.log('')

  // Step 2: Bulk upsert in batches of BATCH_SIZE
  console.log(`Upserting into nifty50_daily in batches of ${BATCH_SIZE}...`)

  let upsertedTotal = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)

    const { error } = await supabase
      .from('nifty50_daily')
      .upsert(batch, { onConflict: 'nav_date' })

    if (error) {
      console.error(`ERROR during upsert batch ${i}–${i + batch.length}:`, error.message)
      process.exit(1)
    }

    upsertedTotal += batch.length

    if (upsertedTotal % 2000 === 0 || i + BATCH_SIZE >= rows.length) {
      const pct = ((upsertedTotal / rows.length) * 100).toFixed(1)
      console.log(`Progress: ${upsertedTotal}/${rows.length} (${pct}%)`)
    }
  }

  // Step 3: Verify final count
  const { count, error: countError } = await supabase
    .from('nifty50_daily')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('ERROR during count check:', countError.message)
    process.exit(1)
  }

  console.log('')
  console.log('=== COMPLETE ===')
  console.log(`Seeded ${upsertedTotal} rows. Earliest: ${earliest}. Latest: ${latest}.`)
  console.log(`Total rows in nifty50_daily: ${count}`)
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
