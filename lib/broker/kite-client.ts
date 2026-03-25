// lib/broker/kite-client.ts
// Thin wrappers over the kiteconnect package for Zerodha OAuth and holdings fetch.
//
// Required environment variables at runtime:
//   KITE_API_KEY     — Kite Connect app API key
//   KITE_API_SECRET  — Kite Connect app API secret

import { KiteConnect } from 'kiteconnect'
import type { KiteHolding } from './kite-holdings-mapper'

/**
 * Returns the Kite OAuth login URL.
 * Appends holderId as the `state` query param so the callback route knows
 * which holder to associate the connection with.
 */
export function getKiteLoginURL(holderId: string): string {
  const kc = new KiteConnect({ api_key: process.env.KITE_API_KEY! })
  return `${kc.getLoginURL()}&state=${holderId}`
}

/**
 * Exchanges a Kite `request_token` for a session.
 * Returns access_token and zerodha user_id.
 * Must be called server-side only — access_token must NOT reach the client.
 */
export async function exchangeKiteToken(
  requestToken: string
): Promise<{ access_token: string; user_id: string }> {
  const kc = new KiteConnect({ api_key: process.env.KITE_API_KEY! })
  const session = await kc.generateSession(requestToken, process.env.KITE_API_SECRET!)
  return { access_token: session.access_token, user_id: session.user_id }
}

/**
 * Fetches long-term DEMAT holdings for the authenticated user.
 * Uses getHoldings() — NOT getPositions() (positions are intraday/short-term).
 * Must be called server-side only.
 */
export async function fetchKiteHoldings(accessToken: string): Promise<KiteHolding[]> {
  const kc = new KiteConnect({ api_key: process.env.KITE_API_KEY! })
  kc.setAccessToken(accessToken)
  return kc.getHoldings() as unknown as KiteHolding[]
}
