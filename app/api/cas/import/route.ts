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

  // Process each folio (a folio can contain multiple schemes)
  for (const folio of casData.folios) {
    // 1. Resolve or create holder by PAN
    let holderId = holderByPan.get(folio.PAN)
    if (!holderId) {
      const holderInsert: HolderInsert = {
        family_id: family.id,
        name: `Holder (${folio.PAN})`,
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

    // 2. Build normalised scheme list covering both casparser output shapes.
    // Shape A (nested): folio.schemes[] — each element has .scheme, .amfi, .transactions, etc.
    // Shape B (flat): folio has .scheme, .amfi, .transactions directly (real-world CAMS output).
    type NormalisedScheme = {
      scheme: string
      amfi: string | null | undefined
      registrar: string | null | undefined
      transactions: typeof folio.transactions
      close: typeof folio.close
      close_calculated: typeof folio.close_calculated
      valuation: typeof folio.valuation
    }
    const schemeList: NormalisedScheme[] = folio.schemes && folio.schemes.length > 0
      ? folio.schemes.map(s => ({
          scheme: s.scheme,
          amfi: s.amfi,
          registrar: s.registrar,
          transactions: s.transactions,
          close: s.close,
          close_calculated: s.close_calculated,
          valuation: s.valuation,
        }))
      : folio.scheme
        ? [{
            scheme: folio.scheme,
            amfi: folio.amfi,
            registrar: folio.registrar,
            transactions: folio.transactions ?? [],
            close: folio.close,
            close_calculated: folio.close_calculated,
            valuation: folio.valuation,
          }]
        : []

    for (const scheme of schemeList) {
      try {
        const schemeCode = scheme.amfi ? parseInt(scheme.amfi, 10) : null
        if (!schemeCode) {
          results.errors.push(`No AMFI scheme code for folio ${folio.folio} (${scheme.scheme})`)
          continue
        }

        const fundInsert: FundInsert = {
          scheme_code: schemeCode,
          scheme_name: scheme.scheme,
          fund_house: scheme.registrar ?? folio.amc ?? 'Unknown',
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

        // 4a. Check if transaction history is complete
        const closeUnits = Number(scheme.close ?? 0)
        const closeCalculated = Number(scheme.close_calculated ?? 0)
        const historyIncomplete = closeUnits > 0 && Math.abs(closeUnits - closeCalculated) > 0.01

        if (historyIncomplete) {
          // Synthesize a single balance transaction from the closing balance
          const cost = Number(scheme.valuation?.cost ?? 0)
          const avgNav = cost > 0 ? cost / closeUnits : Number(scheme.valuation?.nav ?? 0)
          const today = new Date().toISOString().split('T')[0]
          const syntheticTx: TransactionInsert = {
            folio_id: folioRecord.id,
            transaction_date: today,
            transaction_type: 'purchase',
            units: closeUnits,
            nav: parseFloat(avgNav.toFixed(4)),
            amount: cost > 0 ? cost : parseFloat((closeUnits * avgNav).toFixed(2)),
            import_status: 'needs_review',
            source: 'cas_import',
          }
          // Delete any stale partial transactions first, then insert synthesis
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('transactions') as any)
            .delete()
            .eq('folio_id', folioRecord.id)
            .neq('amount', cost > 0 ? cost : 0)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: synErr } = await (supabase.from('transactions') as any).upsert(syntheticTx, {
            onConflict: 'folio_id,transaction_date,transaction_type,units,amount',
            ignoreDuplicates: true,
          })
          if (!synErr) {
            results.needs_review++
          }
          continue  // skip individual transaction processing
        }

        // 4b. Upsert actual transactions (full history available)
        for (const tx of scheme.transactions) {
          if (!tx.units || !tx.nav || !tx.date) {
            results.needs_review++
            continue
          }
          // casparser bug: stamp duty row (₹0.25) bleeds into SIP amount.
          // If amount is suspiciously small (<10) but units+nav are valid, reconstruct it.
          const txAmount = (!tx.amount || tx.amount < 10)
            ? parseFloat((tx.units * tx.nav).toFixed(2))
            : tx.amount

          const dbType = TRANSACTION_TYPE_MAP[tx.type ?? ''] ?? null
          if (!dbType) console.log(`[CAS import] Unknown tx type: "${tx.type}" — flagging needs_review`)
          const importStatus = dbType ? 'clean' : 'needs_review'

          const txInsert: TransactionInsert = {
            folio_id: folioRecord.id,
            transaction_date: tx.date,
            transaction_type: (dbType ?? 'purchase') as TransactionInsert['transaction_type'],
            units: tx.units,
            nav: tx.nav,
            amount: txAmount,
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
        results.errors.push(`Error processing scheme ${scheme.scheme} in folio ${folio.folio}: ${err}`)
      }
    }
  }

  return NextResponse.json({
    success: true,
    imported: results.imported,
    needs_review: results.needs_review,
    errors: results.errors,
  })
}
