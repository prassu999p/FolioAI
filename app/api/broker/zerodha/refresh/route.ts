// app/api/broker/zerodha/refresh/route.ts
// GET handler to refresh Zerodha stock holdings for an existing connection.
// If token is still valid, re-fetches holdings and updates stock_holdings.
// If token is expired, redirects user to re-authorise via Kite login.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchKiteHoldings, getKiteLoginURL } from '@/lib/broker/kite-client'
import { mapKiteHoldingToStockRow } from '@/lib/broker/kite-holdings-mapper'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const holderId = url.searchParams.get('holderId')

  if (!holderId) {
    return NextResponse.redirect(new URL('/families', req.url))
  }

  const supabase = await createClient()

  // Resolve familyId for redirect URLs
  const { data: holderRaw, error: holderError } = await supabase
    .from('holders')
    .select('family_id')
    .eq('id', holderId)
    .single()
  const holder = holderRaw as { family_id: string } | null

  if (holderError || !holder) {
    return NextResponse.redirect(new URL('/families', req.url))
  }

  const familyId = holder.family_id
  const importBase = `/families/${familyId}/import?tab=broker`

  // Fetch existing broker connection
  const { data: conn, error: connError } = await (supabase as any)
    .from('broker_connections')
    .select('access_token, token_expires_at')
    .eq('holder_id', holderId)
    .eq('broker', 'zerodha')
    .single()

  if (connError || !conn) {
    // No connection — send to Kite login to create one
    return NextResponse.redirect(new URL(getKiteLoginURL(holderId), req.url))
  }

  const now = new Date()
  const expiresAt = new Date(conn.token_expires_at)

  if (now >= expiresAt) {
    // Token expired — re-auth required
    return NextResponse.redirect(new URL(getKiteLoginURL(holderId), req.url))
  }

  try {
    // Token still valid — re-fetch holdings and upsert
    const rawHoldings = await fetchKiteHoldings(conn.access_token)
    const rows = rawHoldings.map((h: any) => mapKiteHoldingToStockRow(h, holderId))

    if (rows.length > 0) {
      const { error: upsertError } = await (supabase as any)
        .from('stock_holdings')
        .upsert(rows, { onConflict: 'holder_id,tradingsymbol,exchange' })

      if (upsertError) {
        console.error('[Kite refresh] stock_holdings upsert error:', upsertError)
        return NextResponse.redirect(new URL(`${importBase}&error=refresh_failed`, req.url))
      }
    }

    // Update last_synced_at
    await (supabase as any)
      .from('broker_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('holder_id', holderId)
      .eq('broker', 'zerodha')

    return NextResponse.redirect(new URL(`${importBase}&success=refreshed`, req.url))
  } catch (err) {
    console.error('[Kite refresh] error:', err)
    return NextResponse.redirect(new URL(`${importBase}&error=refresh_failed`, req.url))
  }
}
