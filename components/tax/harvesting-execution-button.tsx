/**
 * Harvesting Execution Button
 *
 * Client component wrapper for the Execute button.
 * Bridges server component (HarvestingHero) with client component (HarvestingExecutionModal).
 */

'use client'

import { HarvestingExecutionModal } from './harvesting-execution-modal'
import type { HarvestingSuggestion } from '@/lib/tax/types'

interface HarvestingExecutionButtonProps {
  suggestions: HarvestingSuggestion[]
  totalTaxSaved: number
}

export function HarvestingExecutionButton({
  suggestions,
  totalTaxSaved,
}: HarvestingExecutionButtonProps) {
  return (
    <HarvestingExecutionModal suggestions={suggestions} totalTaxSaved={totalTaxSaved}>
      <button className="w-full py-4 bg-secondary text-on-secondary rounded-xl font-bold hover:scale-[1.02] transition-transform">
        Execute Harvesting Plan
      </button>
    </HarvestingExecutionModal>
  )
}
