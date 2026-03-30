// app/(dashboard)/families/[familyId]/import/page.tsx
// Server Component — tab routing via ?tab= URL param.
// CAS tab: client form component (file upload requires interactivity).
// Broker tab: fully server-rendered (OAuth link, connection status, holdings table).

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/server'
import { getKiteLoginURL } from '@/lib/broker/kite-client'
import CASImportForm from './CASImportForm'

// Lazy-load TradebookImportForm to avoid SheetJS bloating the main bundle
const TradebookImportForm = dynamic(
  () => import('./TradebookImportForm'),
  { ssr: false }
)

interface PageProps {
  params: Promise<{ familyId: string }>
  searchParams: Promise<{ tab?: string; success?: string; error?: string }>
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatINR(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

export default async function ImportPage({ params, searchParams }: PageProps) {
  const { familyId } = await params
  const { tab = 'cas', success, error } = await searchParams

  const supabase = await createClient()

  // Fetch holders for this family (needed for Broker tab)
  const { data: holdersRaw } = await supabase
    .from('holders')
    .select('id, name')
    .eq('family_id', familyId)
    .order('name')
  const holders = holdersRaw as Array<{ id: string; name: string }> | null

  const holderIds = (holders ?? []).map((h: { id: string }) => h.id)

  // Fetch broker connections for all holders in this family
  const { data: connections } = holderIds.length > 0
    ? await (supabase as any)
        .from('broker_connections')
        .select('holder_id, broker, access_token, token_expires_at, last_synced_at, zerodha_user_id')
        .in('holder_id', holderIds)
        .eq('broker', 'zerodha')
    : { data: [] }

  // Fetch stock holdings for all holders
  const { data: stockHoldings } = holderIds.length > 0
    ? await (supabase as any)
        .from('stock_holdings')
        .select('holder_id, tradingsymbol, exchange, isin, quantity, average_price, last_price, pnl')
        .in('holder_id', holderIds)
        .order('tradingsymbol')
    : { data: [] }

  const now = new Date()

  // Use the first holder as default for Broker tab V1
  const defaultHolder = holders?.[0] ?? null

  // Find connection for the default holder
  const defaultConn = (connections ?? []).find(
    (c: { holder_id: string }) => c.holder_id === defaultHolder?.id
  ) ?? null

  const isConnected =
    defaultConn &&
    defaultConn.token_expires_at &&
    new Date(defaultConn.token_expires_at) > now

  const isExpired =
    defaultConn &&
    defaultConn.token_expires_at &&
    new Date(defaultConn.token_expires_at) <= now

  return (
    <>
      {/* TopAppBar */}
      <header
        className="flex items-center gap-4 w-full px-8 py-4 sticky top-0 z-30"
        style={{ backgroundColor: '#f4faff' }}
      >
        <Link
          href={`/families/${familyId}`}
          className="p-2 rounded-full hover:bg-[#c9e7f7] transition-colors"
          style={{ color: '#001f2a' }}
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h2 className="text-xl font-bold tracking-tight font-headline" style={{ color: '#002B5B' }}>
          Import Holdings
        </h2>
      </header>

      {/* Tab bar */}
      <div className="px-8 pt-6 pb-0 flex gap-2 border-b" style={{ borderColor: '#c9e7f7' }}>
        <Link
          href={`/families/${familyId}/import?tab=cas`}
          className={`px-5 py-2.5 rounded-t-xl text-sm font-semibold transition-colors ${
            tab === 'cas'
              ? 'bg-white border border-b-white'
              : 'hover:bg-[#e6f6ff]'
          }`}
          style={{
            color: tab === 'cas' ? '#001736' : '#43474f',
            borderColor: tab === 'cas' ? '#c9e7f7' : 'transparent',
          }}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">description</span>
            CAS Import
          </span>
        </Link>
        <Link
          href={`/families/${familyId}/import?tab=broker`}
          className={`px-5 py-2.5 rounded-t-xl text-sm font-semibold transition-colors ${
            tab === 'broker'
              ? 'bg-white border border-b-white'
              : 'hover:bg-[#e6f6ff]'
          }`}
          style={{
            color: tab === 'broker' ? '#001736' : '#43474f',
            borderColor: tab === 'broker' ? '#c9e7f7' : 'transparent',
          }}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">account_balance_wallet</span>
            Broker
          </span>
        </Link>
        <Link
          href={`/families/${familyId}/import?tab=tradebook`}
          className={`px-5 py-2.5 rounded-t-xl text-sm font-semibold transition-colors ${
            tab === 'tradebook'
              ? 'bg-white border border-b-white'
              : 'hover:bg-[#e6f6ff]'
          }`}
          style={{
            color: tab === 'tradebook' ? '#001736' : '#43474f',
            borderColor: tab === 'tradebook' ? '#c9e7f7' : 'transparent',
          }}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">upload_file</span>
            Tradebook
          </span>
        </Link>
      </div>

      {/* Tab content */}
      {tab === 'cas' ? (
        <CASImportForm familyId={familyId} />
      ) : tab === 'tradebook' ? (
        <TradebookImportForm familyId={familyId} holders={holders ?? []} />
      ) : (
        /* ---- Broker tab ---- */
        <div className="px-8 py-8 max-w-2xl mx-auto">

          {/* Success / error banner */}
          {success && (
            <div
              className="rounded-xl px-4 py-3 text-sm flex gap-2 items-center mb-6"
              style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}
            >
              <span className="material-symbols-outlined text-base">check_circle</span>
              {success === 'refreshed'
                ? 'Holdings refreshed successfully.'
                : 'Zerodha connected and holdings imported.'}
            </div>
          )}
          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm flex gap-2 items-center mb-6"
              style={{ backgroundColor: '#fef2f2', color: '#991b1b' }}
            >
              <span className="material-symbols-outlined text-base">error</span>
              {error === 'missing_token' && 'Authentication failed — missing token.'}
              {error === 'auth_failed' && 'Authentication failed. Please try again.'}
              {error === 'upsert_failed' && 'Connected but failed to save holdings. Please retry.'}
              {error === 'conn_failed' && 'Connected but failed to save connection. Please retry.'}
              {error === 'refresh_failed' && 'Holdings refresh failed. Please try again.'}
              {!['missing_token','auth_failed','upsert_failed','conn_failed','refresh_failed'].includes(error) && 'An error occurred. Please try again.'}
            </div>
          )}

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: '#387ed1' }}
            >
              <span className="material-symbols-outlined text-white">account_balance_wallet</span>
            </div>
            <div>
              <h3 className="font-bold text-lg font-headline" style={{ color: '#001f2a' }}>
                Connect Zerodha
              </h3>
              <p className="text-sm" style={{ color: '#43474f' }}>
                Import your stock holdings from Zerodha Demat account
              </p>
            </div>
          </div>

          {!defaultHolder ? (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ backgroundColor: '#fef9c3', color: '#854d0e' }}
            >
              No holders found in this family. Add a holder before connecting a broker.
            </div>
          ) : isConnected ? (
            /* Connected state */
            <div className="rounded-2xl border p-6 space-y-4" style={{ borderColor: '#c9e7f7', backgroundColor: '#ffffff' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: '#dcfce7', color: '#15803d' }}
                  >
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Connected
                  </span>
                  <span className="text-sm" style={{ color: '#43474f' }}>
                    {defaultHolder.name}
                  </span>
                </div>
                {defaultConn.zerodha_user_id && (
                  <span className="text-xs font-mono tabular-nums" style={{ color: '#43474f' }}>
                    {defaultConn.zerodha_user_id}
                  </span>
                )}
              </div>

              {defaultConn.last_synced_at && (
                <p className="text-xs" style={{ color: '#43474f' }}>
                  Last synced: {formatDate(defaultConn.last_synced_at)}
                </p>
              )}

              <Link
                href={`/api/broker/zerodha/refresh?holderId=${defaultHolder.id}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#001736', color: '#ffffff' }}
              >
                <span className="material-symbols-outlined text-base">sync</span>
                Refresh Holdings
              </Link>
            </div>
          ) : isExpired ? (
            /* Expired state */
            <div className="rounded-2xl border p-6 space-y-4" style={{ borderColor: '#fde68a', backgroundColor: '#fffbeb' }}>
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
                >
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  Session Expired
                </span>
                <span className="text-sm" style={{ color: '#43474f' }}>
                  {defaultHolder.name}
                </span>
              </div>
              <p className="text-sm" style={{ color: '#78350f' }}>
                Your Zerodha session has expired (Kite tokens expire daily at 6 AM IST). Re-authorise to continue syncing.
              </p>
              <Link
                href={getKiteLoginURL(defaultHolder.id)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#001736', color: '#ffffff' }}
              >
                <span className="material-symbols-outlined text-base">lock_reset</span>
                Re-authorise via Kite
              </Link>
            </div>
          ) : (
            /* Not connected state */
            <div className="rounded-2xl border p-6 space-y-4" style={{ borderColor: '#c9e7f7', backgroundColor: '#ffffff' }}>
              <p className="text-sm" style={{ color: '#43474f' }}>
                Connect your Zerodha Demat account to automatically import stock holdings.
                You will be redirected to Zerodha to authorise FolioAI.
              </p>
              <Link
                href={getKiteLoginURL(defaultHolder.id)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#001736', color: '#ffffff' }}
              >
                <span className="material-symbols-outlined text-base">link</span>
                Connect via Kite
              </Link>
            </div>
          )}

          {/* Stock holdings table */}
          {stockHoldings && stockHoldings.length > 0 && (
            <div className="mt-8">
              <h4 className="font-semibold text-sm mb-3 font-headline" style={{ color: '#001f2a' }}>
                Imported Stock Holdings
              </h4>
              <div className="rounded-3xl border overflow-hidden" style={{ borderColor: '#c9e7f7' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#e6f6ff' }}>
                      <th className="px-4 py-3 text-left font-semibold text-xs" style={{ color: '#43474f' }}>Symbol</th>
                      <th className="px-4 py-3 text-left font-semibold text-xs" style={{ color: '#43474f' }}>Exchange</th>
                      <th className="px-4 py-3 text-right font-semibold text-xs tabular-nums" style={{ color: '#43474f' }}>Qty</th>
                      <th className="px-4 py-3 text-right font-semibold text-xs tabular-nums" style={{ color: '#43474f' }}>Avg Price</th>
                      <th className="px-4 py-3 text-right font-semibold text-xs tabular-nums" style={{ color: '#43474f' }}>Last Price</th>
                      <th className="px-4 py-3 text-right font-semibold text-xs tabular-nums" style={{ color: '#43474f' }}>P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockHoldings.map((s: {
                      tradingsymbol: string
                      exchange: string
                      quantity: number
                      average_price: number
                      last_price: number
                      pnl: number
                    }, i: number) => (
                      <tr
                        key={`${s.tradingsymbol}-${s.exchange}`}
                        style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f4faff' }}
                      >
                        <td className="px-4 py-3 font-medium font-mono tabular-nums" style={{ color: '#001f2a' }}>
                          {s.tradingsymbol}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#43474f' }}>
                          {s.exchange}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums" style={{ color: '#001f2a' }}>
                          {s.quantity}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums" style={{ color: '#001f2a' }}>
                          {formatINR(s.average_price)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums" style={{ color: '#001f2a' }}>
                          {formatINR(s.last_price)}
                        </td>
                        <td
                          className="px-4 py-3 text-right tabular-nums font-medium"
                          style={{ color: s.pnl >= 0 ? '#006d43' : '#991b1b' }}
                        >
                          {s.pnl >= 0 ? '+' : ''}{formatINR(s.pnl)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
