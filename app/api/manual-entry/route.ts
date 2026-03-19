import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validate YYYY-MM-DD format and ensure date is not in the future
const PurchaseDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
  .refine((dateStr) => {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return false
    // Purchase date must not be in the future
    const today = new Date()
    today.setHours(23, 59, 59, 999) // end of today
    return date <= today
  }, 'Purchase date cannot be in the future')

const ManualEntrySchema = z.object({
  holderId: z.string().uuid(),
  schemeCode: z.number().int().positive(),
  schemeName: z.string().min(1),    // for upsert into funds master
  fundHouse: z.string().default(''),
  units: z.number().positive(),
  purchaseDate: PurchaseDateSchema,
  costNav: z.number().positive(),   // NAV at time of purchase
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

export async function POST(request: Request) {
  const supabase: AnySupabase = await createClient()
  const result = await supabase.auth.getClaims()
  const claims = result.data?.claims ?? null
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = ManualEntrySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { holderId, schemeCode, schemeName, fundHouse, units, purchaseDate, costNav } = parsed.data

  // Verify holder belongs to this user's family
  const { data: holderData } = await supabase
    .from('holders')
    .select('id, family_id')
    .eq('id', holderId)
    .single()
  if (!holderData) return NextResponse.json({ error: 'Holder not found' }, { status: 404 })

  // Upsert fund into funds master table (scheme_code is primary key)
  const fundRecord = {
    scheme_code: schemeCode,
    scheme_name: schemeName,
    fund_house: fundHouse,
    category: '',
    scheme_type: '',
  }
  const { error: fundError } = await supabase
    .from('funds')
    .upsert(fundRecord, { onConflict: 'scheme_code', ignoreDuplicates: false })
  if (fundError) return NextResponse.json({ error: fundError.message }, { status: 500 })

  // Upsert folio (holder + scheme combination)
  // Use a synthetic folio_number for manual entries: "MANUAL-{holderId}-{schemeCode}"
  const folioNumber = `MANUAL-${holderId}-${schemeCode}`
  const folioRecord = {
    holder_id: holderId,
    folio_number: folioNumber,
    scheme_code: schemeCode,
  }
  const { data: folioData, error: folioError } = await supabase
    .from('folios')
    .upsert(folioRecord, { onConflict: 'holder_id,scheme_code' })
    .select()
    .single()

  if (folioError) return NextResponse.json({ error: folioError.message }, { status: 500 })
  if (!folioData) return NextResponse.json({ error: 'Failed to create or find folio' }, { status: 500 })

  // Insert transaction with source='manual'
  const amount = units * costNav
  const transactionRecord = {
    folio_id: folioData.id,
    transaction_date: purchaseDate,
    transaction_type: 'purchase',
    units,
    nav: costNav,
    amount,
    import_status: 'clean',
    source: 'manual',
  }
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert(transactionRecord)
    .select()
    .single()

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })
  return NextResponse.json(transaction, { status: 201 })
}
