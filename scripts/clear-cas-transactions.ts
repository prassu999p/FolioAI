/**
 * Clear all CAS-imported transactions, folios, and auto-created holders.
 *
 * Use this before re-importing a CAS PDF after fixing the transaction type bug.
 * Manual transactions (source = 'manual') are NOT touched.
 *
 * USAGE:
 *   npx tsx scripts/clear-cas-transactions.ts
 *
 * REQUIREMENTS:
 *   - NEXT_PUBLIC_SUPABASE_URL env var
 *   - SUPABASE_SERVICE_ROLE_KEY env var (bypasses RLS)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key)

async function main() {
  // 1. Delete all cas_import transactions
  const { error: txErr, count: txCount } = await supabase
    .from('transactions')
    .delete({ count: 'exact' })
    .eq('source', 'cas_import')

  if (txErr) {
    console.error('Error deleting transactions:', txErr.message)
    process.exit(1)
  }
  console.log(`Deleted ${txCount ?? '?'} transactions (source = cas_import)`)

  // 2. Delete folios that no longer have any transactions
  //    (all cas_import folios — they'll be re-created on next import)
  const { data: emptyFolios } = await supabase
    .from('folios')
    .select('id')
    .not('id', 'in', supabase.from('transactions').select('folio_id'))

  if (emptyFolios && emptyFolios.length > 0) {
    const ids = emptyFolios.map((f: { id: string }) => f.id)
    const { error: folioErr, count: folioCount } = await supabase
      .from('folios')
      .delete({ count: 'exact' })
      .in('id', ids)

    if (folioErr) {
      console.error('Error deleting folios:', folioErr.message)
    } else {
      console.log(`Deleted ${folioCount ?? ids.length} empty folios`)
    }
  } else {
    console.log('No empty folios to delete')
  }

  // 3. Delete auto-created holders (pan_unmatched = true) that have no folios
  const { data: emptyHolders } = await supabase
    .from('holders')
    .select('id')
    .eq('pan_unmatched', true)
    .not('id', 'in', supabase.from('folios').select('holder_id'))

  if (emptyHolders && emptyHolders.length > 0) {
    const ids = emptyHolders.map((h: { id: string }) => h.id)
    const { error: holderErr, count: holderCount } = await supabase
      .from('holders')
      .delete({ count: 'exact' })
      .in('id', ids)

    if (holderErr) {
      console.error('Error deleting auto-holders:', holderErr.message)
    } else {
      console.log(`Deleted ${holderCount ?? ids.length} unmatched auto-created holders`)
    }
  } else {
    console.log('No empty auto-created holders to delete')
  }

  console.log('\nDone. Re-import your CAS PDF to repopulate with correct transaction types.')
}

main()
