/**
 * FY Toggle Component
 * 
 * 2-option toggle: Current FY / Prior FY
 * Uses URL search params: ?fy=current (default) or ?fy=prior
 */

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { getCurrentFYBounds, getPriorFYBounds } from '@/lib/tax/fy-utils'

interface FYToggleProps {
  className?: string
}

export function FYToggle({ className = '' }: FYToggleProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const currentFY = getCurrentFYBounds()
  const priorFY = getPriorFYBounds()
  
  const isCurrentFY = searchParams.get('fy') !== 'prior'
  
  const handleToggle = useCallback((fy: 'current' | 'prior') => {
    const params = new URLSearchParams(searchParams.toString())
    if (fy === 'prior') {
      params.set('fy', 'prior')
    } else {
      params.delete('fy')
    }
    router.push(`?${params.toString()}`)
  }, [router, searchParams])
  
  return (
    <div className={`flex gap-2 ${className}`}>
      <button
        onClick={() => handleToggle('current')}
        className={`
          px-4 py-2 rounded-full text-sm font-medium transition-all
          ${isCurrentFY 
            ? 'bg-primary text-on-primary shadow-md' 
            : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'
          }
        `}
      >
        This {currentFY.label}
      </button>
      <button
        onClick={() => handleToggle('prior')}
        className={`
          px-4 py-2 rounded-full text-sm font-medium transition-all
          ${!isCurrentFY 
            ? 'bg-primary text-on-primary shadow-md' 
            : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'
          }
        `}
      >
        {priorFY.label}
      </button>
    </div>
  )
}
