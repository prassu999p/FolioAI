// app/api/broker/zerodha/callback/route.ts
// GET handler for Zerodha Kite Connect OAuth callback.
// Kite redirects here with ?request_token=...&state=holderId after user authorises.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeKiteToken, fetchKiteHoldings } from '@/lib/broker/kite-client'
import { mapKiteHoldingToStockRow } from '@/lib/broker/kite-holdings-mapper'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const requestToken = url.searchParams.get('request_token')
  const holderId = url.searchParams.get('state')

  // Missing required params — redirect back with error
  if (!requestToken || !holderId) {
    // We don't have a familyId here without a holderId — redirect to dashboard root
    return NextResponse.redirect(new URL('/families', req.url))
  }

  const supabase = await createClient()

  // Resolve familyId from holder so we can redirect back to the right import page
  const { data: holderRaw, error: holderError } = await supabase
    .from('holders')
    .select('family_id')
    .eq('id', holderId)
    .single()
  const holder = holderRaw as { family_id: string } | null

  if (holderError || !holder) {
    return NextResponse.redirect(
      new URL(`/families`, req.url)
    )
  }

  const familyId = holder.family_id
  const importBase = `/families/${familyId}/import?tab=broker`

  try {
    // Exchange request_token for access_token
    const { access_token, user_id } = await exchangeKiteToken(requestToken)

    // Fetch DEMAT holdings (long-term, not positions)
    const rawHoldings = await fetchKiteHoldings(access_token)

    // Map to DB shape and upsert into stock_holdings
    const rows = rawHoldings.map(h => mapKiteHoldingToStockRow(h, holderId))

    if (rows.length > 0) {
      const { error: upsertError } = await (supabase as any)
        .from('stock_holdings')
        .upsert(rows, { onConflict: 'holder_id,tradingsymbol,exchange' })

      if (upsertError) {
        console.error('[Kite callback] stock_holdings upsert error:', upsertError)
        return NextResponse.redirect(new URL(`${importBase}&error=upsert_failed`, req.url))
      }
    }

    // Compute token expiry: next 6 AM IST (= 00:30 UTC)
    const expiresAt = new Date()
    expiresAt.setUTCHours(0, 30, 0, 0)
    if (new Date() >= expiresAt) expiresAt.setDate(expiresAt.getDate() + 1)

    // Upsert broker_connections row
    const { error: connError } = await (supabase as any)
      .from('broker_connections')
      .upsert(
        {
          holder_id: holderId,
          broker: 'zerodha',
          zerodha_user_id: user_id,
          access_token,
          token_expires_at: expiresAt.toISOString(),
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: 'holder_id,broker' }
      )

    if (connError) {
      console.error('[Kite callback] broker_connections upsert error:', connError)
      return NextResponse.redirect(new URL(`${importBase}&error=conn_failed`, req.url))
    }

    return NextResponse.redirect(new URL(`${importBase}&success=true`, req.url))
  } catch (err) {
    console.error('[Kite callback] error:', err)
    return NextResponse.redirect(new URL(`${importBase}&error=auth_failed`, req.url))
  }
}
