import { describe, it, expect } from 'vitest'
import { computeHarvestingSuggestions } from '@/lib/tax/harvesting'
import type { UnrealizedGain } from '@/lib/tax/types'

const makeGain = (schemeCode: number, gain: number, isLTCG: boolean): UnrealizedGain => {
  // Helper to create realistic test gains
  // If gain = 50000 with currentNav = 100, we need:
  // unrealizedGain = remainingUnits * (currentNav - effectiveCostBasis)
  // We'll assume 1000 units for simplicity: gainPerUnit = 50000 / 1000 = 50
  // So effectiveCostBasis = 100 - 50 = 50
  const currentNav = 100
  const remainingUnits = 1000
  const gainPerUnit = gain / remainingUnits
  const effectiveCostBasis = currentNav - gainPerUnit

  return {
    lotId: `lot-${schemeCode}`,
    currentNav,
    currentDate: new Date(),
    holdingDays: 400,
    effectiveCostBasis,
    unrealizedGain: gain,
    wouldBeLTCG: isLTCG,
    assetClass: 'equity',
    schemeCode,
    schemeName: `Fund ${schemeCode}`,
  }
}

describe('Harvesting', () => {
  it('computeHarvestingSuggestions: selects optimal funds with positive unrealized LTCG', () => {
    const gains = [makeGain(100, 50000, true)]
    const suggestions = computeHarvestingSuggestions(
      gains,
      0,
      new Map([[100, 100]]),
      new Map([[100, 'Test Equity Fund']])
    )
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].schemeCode).toBe(100)
    expect(suggestions[0].ltcgToBook).toBeGreaterThan(0)
    expect(suggestions[0].ltcgToBook).toBeLessThanOrEqual(50000)
    // Verify FIFO profit fields exist
    expect(suggestions[0].costBasisPerUnit).toBeGreaterThan(0)
    expect(suggestions[0].costBasisTotal).toBeGreaterThan(0)
    expect(suggestions[0].sellValuePerUnit).toBeGreaterThan(0)
    expect(suggestions[0].sellValueTotal).toBeGreaterThan(0)
    expect(suggestions[0].profitPerUnit).toBeGreaterThan(0)
    expect(suggestions[0].profitTotal).toBeGreaterThan(0)
    // Profit should approximately equal ltcgToBook
    expect(Math.abs(suggestions[0].profitTotal - suggestions[0].ltcgToBook)).toBeLessThan(1)
  })

  it('computeHarvestingSuggestions: stops when exemption consumed', () => {
    // Two funds each with ₹80,000 unrealized LTCG — exemption is ₹1,25,000
    const gains = [
      makeGain(101, 80000, true),
      makeGain(102, 80000, true),
    ]
    const suggestions = computeHarvestingSuggestions(
      gains,
      0,
      new Map([[101, 100], [102, 100]]),
      new Map([[101, 'Fund A'], [102, 'Fund B']])
    )
    const totalBooked = suggestions.reduce((sum, s) => sum + s.ltcgToBook, 0)
    // Total booked should not exceed exemption limit of ₹1,25,000
    expect(totalBooked).toBeLessThanOrEqual(125000)
    expect(suggestions.length).toBeGreaterThan(0)
  })

  it('computeHarvestingSuggestions: excludes negative gains (loss positions)', () => {
    const gains = [
      makeGain(103, -20000, false),   // loss position
      makeGain(104, 40000, true),     // profit position
    ]
    const suggestions = computeHarvestingSuggestions(
      gains,
      0,
      new Map([[103, 100], [104, 100]]),
      new Map([[103, 'Loss Fund'], [104, 'Gain Fund']])
    )
    // Only the gain fund should appear
    expect(suggestions.every(s => s.schemeCode !== 103)).toBe(true)
    expect(suggestions.some(s => s.schemeCode === 104)).toBe(true)
  })

  it('computeHarvestingSuggestions: ltcgUsedThisFY=100000 leaves only ₹25,000 remaining', () => {
    const gains = [makeGain(105, 50000, true)]
    const suggestions = computeHarvestingSuggestions(
      gains,
      100000,
      new Map([[105, 100]]),
      new Map([[105, 'Fund C']])
    )
    // Remaining exemption = 125000 - 100000 = 25000
    const totalBooked = suggestions.reduce((sum, s) => sum + s.ltcgToBook, 0)
    expect(totalBooked).toBeLessThanOrEqual(25000)
  })

  it('computeHarvestingSuggestions: returns empty when exemption fully used', () => {
    const gains = [makeGain(106, 30000, true)]
    const suggestions = computeHarvestingSuggestions(
      gains,
      125000,  // Exemption fully consumed
      new Map([[106, 100]]),
      new Map([[106, 'Fund D']])
    )
    expect(suggestions).toHaveLength(0)
  })
})
