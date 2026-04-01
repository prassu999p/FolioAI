'use client'

// components/holdings/stock-holdings-table.tsx
// Unified stock holdings table supporting all sources: zerodha, tradebook, manual.
// Tradebook rows: read-only enforcement + import date tooltip on symbol.
// Non-tradebook rows: edit/delete actions (no-op stubs for now).

interface StockHolding {
  id: string
  tradingsymbol: string
  exchange: string
  isin: string | null
  quantity: number
  average_price: number
  last_price: number | null
  pnl: number | null
  source: 'zerodha' | 'manual' | 'tradebook'
  imported_at: string | null
  import_filename: string | null
}

interface StockHoldingsTableProps {
  holdings: StockHolding[]
}

function formatINR(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

function formatImportDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function SourceBadge({ source }: { source: 'zerodha' | 'manual' | 'tradebook' }) {
  if (source === 'tradebook') {
    return (
      <span
        className="px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{ backgroundColor: '#e6f6ff', color: '#006d43' }}
      >
        Tradebook
      </span>
    )
  }
  if (source === 'zerodha') {
    return (
      <span
        className="px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{ backgroundColor: '#f4faff', color: '#001736' }}
      >
        Zerodha
      </span>
    )
  }
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: '#f9f9f9', color: '#43474f' }}
    >
      Manual
    </span>
  )
}

export default function StockHoldingsTable({ holdings }: StockHoldingsTableProps) {
  if (holdings.length === 0) {
    return (
      <div className="text-center py-16" style={{ color: '#43474f' }}>
        <span className="material-symbols-outlined text-4xl mb-3 block" style={{ color: '#c9e7f7' }}>
          show_chart
        </span>
        <p className="text-sm font-medium" style={{ color: '#001f2a' }}>No stock holdings yet.</p>
        <p className="text-xs mt-1" style={{ color: '#43474f' }}>
          Import a tradebook or connect a broker account.
        </p>
      </div>
    )
  }

  return (
    <div
      className="rounded-3xl overflow-hidden shadow-sm"
      style={{ backgroundColor: '#ffffff' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'rgba(230, 246, 255, 0.3)' }}>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'rgba(67,71,79,0.7)' }}>Symbol</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'rgba(67,71,79,0.7)' }}>Exchange</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'rgba(67,71,79,0.7)' }}>ISIN</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tabular-nums" style={{ color: 'rgba(67,71,79,0.7)' }}>Qty</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tabular-nums" style={{ color: 'rgba(67,71,79,0.7)' }}>Avg Price</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tabular-nums" style={{ color: 'rgba(67,71,79,0.7)' }}>Last Price</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tabular-nums" style={{ color: 'rgba(67,71,79,0.7)' }}>P&amp;L</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'rgba(67,71,79,0.7)' }}>Source</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'rgba(67,71,79,0.7)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding, i) => {
              const isTradebook = holding.source === 'tradebook'
              const tooltipText =
                isTradebook && holding.imported_at
                  ? `Imported via Tradebook on ${formatImportDate(holding.imported_at)}`
                  : undefined

              return (
                <tr
                  key={holding.id}
                  className="hover:bg-[rgba(230,246,255,0.2)] transition-colors"
                  style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f4faff' }}
                >
                  {/* Symbol cell — tradebook rows get tooltip + badge */}
                  <td className="px-4 py-3 font-mono text-xs font-medium tabular-nums" style={{ color: '#001f2a' }}>
                    <span className="flex items-center gap-1">
                      <span title={tooltipText}>
                        {holding.tradingsymbol}
                      </span>
                      {isTradebook && holding.imported_at && (
                        <span
                          className="material-symbols-outlined"
                          style={{ color: '#006d43', fontSize: '14px' }}
                          title={tooltipText}
                        >
                          upload_file
                        </span>
                      )}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-xs" style={{ color: '#43474f' }}>
                    {holding.exchange}
                  </td>

                  <td className="px-4 py-3 text-xs font-mono" style={{ color: '#43474f' }}>
                    {holding.isin ?? '—'}
                  </td>

                  <td className="px-4 py-3 text-right tabular-nums text-xs" style={{ color: '#001f2a' }}>
                    {holding.quantity.toFixed(2)}
                  </td>

                  <td className="px-4 py-3 text-right tabular-nums text-xs" style={{ color: '#001f2a' }}>
                    {formatINR(holding.average_price)}
                  </td>

                  <td className="px-4 py-3 text-right tabular-nums text-xs" style={{ color: '#43474f' }}>
                    {holding.last_price !== null ? formatINR(holding.last_price) : '—'}
                  </td>

                  <td
                    className="px-4 py-3 text-right tabular-nums text-xs font-medium"
                    style={{
                      color:
                        holding.pnl === null
                          ? '#43474f'
                          : holding.pnl >= 0
                          ? '#006d43'
                          : '#991b1b',
                    }}
                  >
                    {holding.pnl !== null
                      ? `${holding.pnl >= 0 ? '+' : ''}${formatINR(holding.pnl)}`
                      : '—'}
                  </td>

                  <td className="px-4 py-3">
                    <SourceBadge source={holding.source} />
                  </td>

                  {/* Actions — read-only for tradebook rows */}
                  <td className="px-4 py-3">
                    {isTradebook ? (
                      <span
                        className="text-xs italic"
                        style={{ color: '#43474f' }}
                        title="Re-upload a corrected file to update tradebook-imported stocks"
                      >
                        Read-only
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => alert('Edit coming soon')}
                          className="p-1 rounded-lg hover:bg-[#e6f6ff] transition-colors"
                          title="Edit holding"
                          style={{ color: '#43474f' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                        </button>
                        <button
                          onClick={() => alert('Delete coming soon')}
                          className="p-1 rounded-lg hover:bg-[#fef2f2] transition-colors"
                          title="Delete holding"
                          style={{ color: '#991b1b' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
