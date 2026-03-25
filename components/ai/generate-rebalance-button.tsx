'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface GenerateRebalanceButtonProps {
  familyId: string
  hasExisting: boolean
}

export function GenerateRebalanceButton({
  familyId,
  hasExisting,
}: GenerateRebalanceButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const router = useRouter()

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      await fetch('/api/ai/rebalance-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId }),
      })
      router.refresh() // Re-render Server Components to show the new strategy
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={isGenerating}
      className="w-full py-4 rounded-lg bg-secondary text-on-secondary font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      {isGenerating ? (
        <>
          <span className="material-symbols-outlined text-base animate-spin">
            progress_activity
          </span>
          Generating...
        </>
      ) : (
        <>
          <span className="material-symbols-outlined text-base">psychology</span>
          {hasExisting ? 'Regenerate Strategy' : 'Generate Rebalance Strategy'}
        </>
      )}
    </button>
  )
}
