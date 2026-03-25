'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface GenerateReviewButtonProps {
  holderId: string
  hasExisting: boolean
}

export function GenerateReviewButton({ holderId, hasExisting }: GenerateReviewButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const router = useRouter()

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      await fetch('/api/ai/generate-narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holderId }),
      })
      router.refresh() // Re-render Server Components to show new narrative
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={isGenerating}
      className="flex items-center gap-2 border border-secondary text-secondary rounded-xl px-4 py-2 text-sm font-semibold hover:bg-secondary/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          <span className="material-symbols-outlined text-base">auto_awesome</span>
          {hasExisting ? 'Regenerate' : 'Generate Review'}
        </>
      )}
    </button>
  )
}
