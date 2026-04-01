'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface HolderSelectorProps {
  holders: { id: string; name: string }[]
  defaultHolderId: string
}

export function HolderSelector({ holders, defaultHolderId }: HolderSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeId = searchParams.get('holder') ?? defaultHolderId

  const selectHolder = useCallback((holderId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (holderId === defaultHolderId) {
      params.delete('holder')  // default = no param (clean URL)
    } else {
      params.set('holder', holderId)
    }
    router.push(`?${params.toString()}`)
  }, [router, searchParams, defaultHolderId])

  if (holders.length <= 1) return null  // hide if single holder

  return (
    <div className="flex gap-2">
      {holders.map(h => (
        <button
          key={h.id}
          onClick={() => selectHolder(h.id)}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
            activeId === h.id
              ? 'bg-primary text-on-primary shadow-md'
              : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
          }`}
        >
          {h.name}
        </button>
      ))}
    </div>
  )
}
