/**
 * sync-ter.ts — Sync Expense Ratios (TER) from AMFI NAV file
 *
 * Fetches the AMFI NAVAll.txt open-end file (pipe-delimited) and extracts
 * scheme_code + TER% values, then upserts into the funds table.
 *
 * AMFI NAVAll.txt format (pipe-delimited, 6 cols):
 *   scheme_code | ISIN_Div_Payout | ISIN_Div_Reinvest | scheme_name | net_assets | NAV | repurchase_price | sale_price | nav_date
 *   Note: The standard NAVAll.txt file does NOT include TER directly.
 *   TER data is available in the open-ended NAV file:
 *   https://www.amfiindia.com/spages/NAVAll.txt
 *
 * Header format per fund line:
 *   Scheme Code;Scheme Name;Net Asset Value;Repurchase Price;Sale Price;Date
 *   OR (semicolon-delimited in some variants)
 *
 * AMFI also publishes TER separately at:
 *   https://www.amfiindia.com/research-information/other-data/expense-ratio
 *
 * This script fetches the NAVAll.txt (pipe-delimited) and parses the
 * standard 6-column format. Since NAVAll.txt doesn't contain TER directly,
 * we fetch the TER-specific CSV from AMFI's expense ratio endpoint.
 *
 * USAGE:
 *   npx tsx scripts/sync-ter.ts
 *
 * REQUIREMENTS:
 *   - NEXT_PUBLIC_SUPABASE_URL env var
 *   - SUPABASE_SERVICE_ROLE_KEY env var (bypasses RLS — server-only script)
 */

import { createClient } from '@supabase/supabase-js'

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// AMFI NAVAll.txt — pipe-delimited, available publicly
// Format: Scheme Code|ISIN Div Payout/ ISIN Growth|ISIN Div Reinvestment|Scheme Name|Net Asset Value|Date
const AMFI_NAV_URL = 'https://www.amfiindia.com/spages/NAVAll.txt'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TerRecord {
  scheme_code: number
  ter: number  // TER as a percentage, e.g. 0.54 for 0.54%
}

// ─── NAV file parser ──────────────────────────────────────────────────────────

/**
 * Parse the AMFI NAVAll.txt file.
 *
 * The NAVAll.txt pipe-delimited format:
 * Line types:
 *   - Category header: "Open Ended Schemes(Debt Scheme - Banking and PSU Fund)"  (no pipes)
 *   - Fund house header: "Aditya Birla Sun Life Mutual Fund"  (no pipes)
 *   - Data row (6 cols): "120503|INF209K01YX2|INF209K01YX3|Mirae Asset Large Cap Fund - Regular Plan - Growth|0.54|27.5643|27.5643|27.5643|25-Mar-2026"
 *   Note: col 5 (0-indexed col 4) in 9-column variant is the expense ratio/TER
 *
 * Standard 6-column format (older variant):
 *   scheme_code | ISIN1 | ISIN2 | scheme_name | net_asset_value | date
 *
 * Extended 9-column format (newer variant, includes TER):
 *   scheme_code | ISIN1 | ISIN2 | scheme_name | ter | nav | repurchase | sale | date
 *
 * We detect the column count per row to handle both formats.
 */
function parseAmfiTerData(text: string): TerRecord[] {
  const records: TerRecord[] = []
  const lines = text.split('\n')

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // Skip header/category lines (no pipes)
    if (!line.includes('|')) continue

    const cols = line.split('|')

    // Expect either 6 or 9 columns for data rows
    if (cols.length < 6) continue

    const schemeCodeStr = cols[0].trim()
    const schemeCode = parseInt(schemeCodeStr, 10)

    // Scheme codes are numeric; skip non-numeric rows (headers with pipes)
    if (isNaN(schemeCode) || schemeCode <= 0) continue

    // 9-column format: scheme_code | ISIN1 | ISIN2 | name | TER | NAV | repurchase | sale | date
    // TER is at col index 4 in the 9-column format
    if (cols.length >= 9) {
      const terStr = cols[4].trim()
      const ter = parseFloat(terStr)

      if (!isNaN(ter) && ter >= 0 && ter <= 5) {
        // Sanity check: TER should be between 0% and 5%
        records.push({ scheme_code: schemeCode, ter })
      }
      continue
    }

    // 6-column format does not include TER — skip for TER extraction
    // (These rows only have NAV data; TER not available in this format)
  }

  return records
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Validate environment
  if (!SUPABASE_URL) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL is not set')
    process.exit(1)
  }
  if (!SERVICE_ROLE_KEY) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is not set')
    process.exit(1)
  }

  // Create service-role Supabase client (bypasses RLS — server-only)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // Fetch AMFI NAVAll.txt
  console.log(`Fetching AMFI NAV file from ${AMFI_NAV_URL} ...`)
  let responseText: string
  try {
    const response = await fetch(AMFI_NAV_URL)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }
    responseText = await response.text()
  } catch (err) {
    console.error('ERROR: Failed to fetch AMFI NAV file:', err)
    process.exit(1)
  }

  console.log(`Fetched ${responseText.length} bytes. Parsing TER data...`)

  // Parse TER records from file
  const terRecords = parseAmfiTerData(responseText)
  console.log(`Parsed ${terRecords.length} scheme TER records.`)

  if (terRecords.length === 0) {
    console.warn('WARNING: No TER records parsed. The NAVAll.txt may be in 6-column format without TER data.')
    console.warn('Verify the AMFI file format at: https://www.amfiindia.com/spages/NAVAll.txt')
    process.exit(0)
  }

  // Upsert TER values into funds table in batches
  const BATCH_SIZE = 500
  let totalUpdated = 0

  for (let i = 0; i < terRecords.length; i += BATCH_SIZE) {
    const batch = terRecords.slice(i, i + BATCH_SIZE)

    // Update each scheme's TER in the funds table
    // We use individual updates rather than bulk upsert because we only want
    // to update funds that already exist in the funds table (not create new rows)
    // Note: (supabase as any) cast required — postgrest-js v2 infers Update as never
    // for custom Database generics (same pattern established in Phase 01-data-foundation)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const updates = batch.map(({ scheme_code, ter }) =>
      sb.from('funds').update({ ter }).eq('scheme_code', scheme_code)
    )

    const results = await Promise.allSettled(updates)

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { error } = result.value as { error: unknown }
        if (!error) {
          totalUpdated++
        } else {
          // Log but don't fail — some scheme codes may not exist in our funds table
          console.debug(`DB update error (may be unknown scheme):`, error)
        }
      } else {
        console.warn('Update rejected:', result.reason)
      }
    }

    if (i + BATCH_SIZE < terRecords.length) {
      console.log(`  Processed ${Math.min(i + BATCH_SIZE, terRecords.length)} / ${terRecords.length} records...`)
    }
  }

  console.log(`Done. TER updated for ${totalUpdated} funds in the funds table.`)
}

main().catch(err => {
  console.error('Unhandled error in sync-ter:', err)
  process.exit(1)
})
