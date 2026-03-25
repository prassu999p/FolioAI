import type { FundScore } from '@/lib/ai/types'

interface AIPortfolioHealthProps {
  scores: (FundScore & { scheme_name?: string })[]
  holderName: string
}

export function AIPortfolioHealth({ scores, holderName: _holderName }: AIPortfolioHealthProps) {
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s.quality_score, 0) / scores.length)
      : null

  // Circular SVG: r=34, circumference = 2π*34 ≈ 213.6
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const dashArray =
    avgScore !== null ? ((circumference * avgScore) / 100).toFixed(1) : '0'

  return (
    <div className="p-8 rounded-3xl bg-primary text-on-primary relative overflow-hidden">
      {/* Decorative blur orb */}
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#8af8ba]/10 rounded-full blur-3xl" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h3 className="font-headline text-lg font-bold text-on-primary">AI Portfolio Health</h3>
        <span
          className="material-symbols-outlined text-[#8af8ba]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          auto_awesome
        </span>
      </div>

      {/* Circular quality score */}
      {avgScore !== null && (
        <div className="flex items-center gap-6 mb-8">
          <div className="relative w-20 h-20 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              {/* Background track */}
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="6"
              />
              {/* Score arc */}
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                stroke="#8af8ba"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${dashArray} ${circumference}`}
              />
            </svg>
            <span className="absolute text-xl font-bold tabular-nums text-on-primary">
              {avgScore}
            </span>
          </div>
          <div>
            <p className="text-sm text-on-primary/70">Quality Score</p>
            <p className="text-xs font-medium text-[#8af8ba]">
              {avgScore >= 75
                ? 'Strong Portfolio'
                : avgScore >= 50
                  ? 'Average Quality'
                  : 'Needs Attention'}
            </p>
          </div>
        </div>
      )}

      {/* Fund rows */}
      {scores.length === 0 ? (
        <p className="text-sm text-on-primary/60 text-center py-4">
          No scores yet. Click &ldquo;Refresh Scores&rdquo; to analyse your portfolio.
        </p>
      ) : (
        <div className="space-y-4">
          {scores.map((score) => {
            const isUnderperforming = score.alpha_pct !== null && score.alpha_pct < 0
            const alphaBarColor = isUnderperforming ? 'bg-amber-400' : 'bg-[#8af8ba]'
            // Scale: ±20% alpha = full bar (alpha_pct is decimal, so ±0.20 = full)
            const alphaWidth =
              score.alpha_pct !== null
                ? Math.min(100, Math.abs(score.alpha_pct) * 500) // 0.20 * 500 = 100%
                : 0

            const fundLabel =
              score.scheme_name ?? `Fund ${score.scheme_code}`

            return (
              <div
                key={score.scheme_code}
                className="p-4 bg-white/10 rounded-xl"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold uppercase text-on-primary truncate max-w-[60%]">
                    {fundLabel}
                  </span>
                  <span
                    className={`text-xs tabular-nums font-semibold ${
                      isUnderperforming ? 'text-amber-300' : 'text-[#8af8ba]'
                    }`}
                  >
                    {score.alpha_pct !== null
                      ? `${score.alpha_pct > 0 ? '+' : ''}${(score.alpha_pct * 100).toFixed(1)}% Alpha`
                      : 'N/A'}
                  </span>
                </div>
                <div className="h-1 bg-white/20 rounded-full">
                  <div
                    className={`h-full rounded-full ${alphaBarColor} transition-all`}
                    style={{ width: `${alphaWidth}%` }}
                  />
                </div>
                {score.expense_ratio !== null && (
                  <p className="text-[10px] mt-2 text-on-primary/50">
                    Expense Ratio: {score.expense_ratio.toFixed(2)}%
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* SEBI disclaimer */}
      <p className="text-xs text-on-primary/40 italic mt-6 border-t border-white/10 pt-4">
        Educational analysis only. Not SEBI-registered investment advice.
      </p>
    </div>
  )
}
