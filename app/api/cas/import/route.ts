import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CASOutputSchema, TRANSACTION_TYPE_MAP } from '@/lib/validators/cas-schema'
import type { Holder, Folio, HolderInsert, FolioInsert, TransactionInsert, FundInsert } from '@/lib/supabase/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export async function POST(request: Request) {
  const supabase = await createClient()
  const claimsResult = await supabase.auth.getClaims()
  const claims = claimsResult.data?.claims ?? null
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get family for this user
  const { data: familyData, error: familyError } = await supabase
    .from('families')
    .select('id')
    .eq('user_id', claims.sub)
    .single()

  const family = familyData as { id: string } | null
  if (familyError || !family) {
    return NextResponse.json(
      { error: 'Family not found. Create a family first.' },
      { status: 404 }
    )
  }

  // Forward PDF to Python CAS parser
  const formData = await request.formData()
  const pyUrl = `${process.env.PYTHON_API_URL}/api/cas/parse`

  let pyResponse: Response
  try {
    pyResponse = await fetch(pyUrl, { method: 'POST', body: formData })
  } catch {
    return NextResponse.json({ error: 'CAS parser service unavailable' }, { status: 503 })
  }

  const parsed = await pyResponse.json()
  if (parsed.status === 'error') {
    return NextResponse.json({ error: parsed.message }, { status: 422 })
  }

  // Validate casparser output with Zod
  const validation = CASOutputSchema.safeParse(parsed.data)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'CAS output failed schema validation', details: validation.error.issues },
      { status: 422 }
    )
  }

  const casData = validation.data
  const results = { imported: 0, skipped: 0, needs_review: 0, errors: [] as string[] }

  // Load all existing holders for this family (for PAN matching)
  const { data: holdersData } = await supabase
    .from('holders')
    .select('id, pan')
    .eq('family_id', family.id)

  const existingHolders = (holdersData as AnyRecord[] | null) ?? []
  const holderByPan = new Map<string, string>(
    existingHolders.map((h) => [h.pan as string, h.id as string])
  )

  // Process each folio
  for (const folio of casData.folios) {
    try {
      // 1. Resolve or create holder by PAN
      let holderId = holderByPan.get(folio.PAN)
      if (!holderId) {
        const holderInsert: HolderInsert = {
          family_id: family.id,
          name: `Holder (${folio.PAN})`, // user can rename after import
          pan: folio.PAN,
          pan_unmatched: true,
          is_primary: false,
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newHolderData } = await (supabase.from('holders') as any)
          .insert(holderInsert)
          .select('id')
          .single()
        const newHolder = newHolderData as Pick<Holder, 'id'> | null
        if (newHolder) {
          holderId = newHolder.id
          holderByPan.set(folio.PAN, holderId)
        }
      }

      if (!holderId) {
        results.errors.push(`Could not create holder for PAN ${folio.PAN}`)
        continue
      }

      // 2. Resolve fund (upsert into funds master table)
      const schemeCode = folio.amfi ? parseInt(folio.amfi, 10) : null
      if (!schemeCode) {
        results.errors.push(`No AMFI scheme code for folio ${folio.folio} (${folio.scheme})`)
        continue
      }

      const fundInsert: FundInsert = {
        scheme_code: schemeCode,
        scheme_name: folio.scheme,
        fund_house: folio.registrar ?? 'Unknown',
        category: '',
        scheme_type: '',
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('funds') as any).upsert(fundInsert, {
        onConflict: 'scheme_code',
        ignoreDuplicates: true,
      })

      // 3. Upsert folio record
      const folioInsert: FolioInsert = {
        holder_id: holderId,
        folio_number: folio.folio,
        scheme_code: schemeCode,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: folioRecordData } = await (supabase.from('folios') as any)
        .upsert(folioInsert, { onConflict: 'holder_id,folio_number,scheme_code' })
        .select('id')
        .single()

      const folioRecord = folioRecordData as Pick<Folio, 'id'> | null
      if (!folioRecord) continue

      // 4. Upsert transactions (deduplication via ON CONFLICT DO NOTHING)
      for (const tx of folio.transactions) {
        if (!tx.units || !tx.nav || !tx.amount || !tx.date) {
          results.needs_review++
          continue
        }

        const dbType = TRANSACTION_TYPE_MAP[tx.type ?? ''] ?? null
        const importStatus = dbType ? 'clean' : 'needs_review'

        const txInsert: TransactionInsert = {
          folio_id: folioRecord.id,
          transaction_date: tx.date,
          transaction_type: (dbType ?? 'purchase') as TransactionInsert['transaction_type'],
          units: tx.units,
          nav: tx.nav,
          amount: tx.amount,
          import_status: importStatus as 'clean' | 'needs_review',
          source: 'cas_import',
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: txError } = await (supabase.from('transactions') as any).upsert(txInsert, {
          onConflict: 'folio_id,transaction_date,transaction_type,units,amount',
          ignoreDuplicates: true,
        })

        if (txError) {
          results.errors.push(`Transaction insert error: ${txError.message}`)
        } else if (importStatus === 'needs_review') {
          results.needs_review++
        } else {
          results.imported++
        }
      }
    } catch (err) {
      results.errors.push(`Error processing folio ${folio.folio}: ${err}`)
    }
  }

  return NextResponse.json({
    success: true,
    imported: results.imported,
    needs_review: results.needs_review,
    errors: results.errors,
  })
}
