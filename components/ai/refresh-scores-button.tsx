'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface RefreshScoresButtonProps {
  holderId: string
}

export function RefreshScoresButton({ holderId }: RefreshScoresButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleRefresh() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/score-funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holderId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error ?? `Request failed (${res.status})`)
        return
      }

      // Refresh the page to show updated scores from fund_ai_scores
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#8af8ba]/20 hover:bg-[#8af8ba]/30 text-[#8af8ba] font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        <span
          className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {loading ? 'progress_activity' : 'refresh'}
        </span>
        {loading ? 'Analysing…' : 'Refresh Scores'}
      </button>
      {error && (
        <p className="text-xs text-amber-400 mt-2 text-center">{error}</p>
      )}
    </div>
  )
}
