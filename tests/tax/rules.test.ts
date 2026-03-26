import { describe, it, expect } from 'vitest'
import { classifyGain, applyGrandfathering, getTaxAssetClass } from '@/lib/tax/rules'

describe('Tax Rules', () => {
  describe('classifyGain', () => {
    it('classifyGain: equity held >= 365 days = LTCG at 12.5%', () => {
      const result = classifyGain({ holdingDays: 400, assetClass: 'equity', isPostApr2023: false })
      expect(result.classification).toBe('LTCG')
      expect(result.taxRate).toBe(0.125)
    })

    it('classifyGain: equity held < 365 days = STCG at 20%', () => {
      const result = classifyGain({ holdingDays: 200, assetClass: 'equity', isPostApr2023: false })
      expect(result.classification).toBe('STCG')
      expect(result.taxRate).toBe(0.20)
    })

    it('classifyGain: debt post-Apr 2023 = SLAB (no fixed rate)', () => {
      const result = classifyGain({ holdingDays: 400, assetClass: 'debt', isPostApr2023: true })
      expect(result.classification).toBe('SLAB')
      expect(result.taxRate).toBeNull()
    })

    it('classifyGain: debt pre-Apr 2023 >= 24 months = LTCG', () => {
      const result = classifyGain({ holdingDays: 730, assetClass: 'debt', isPostApr2023: false })
      expect(result.classification).toBe('LTCG')
      expect(result.taxRate).toBe(0.125)
    })
  })

  describe('applyGrandfathering', () => {
    it('applyGrandfathering: pre-2018 uses MAX/MIN formula', () => {
      // MAX(purchaseNav=30, MIN(grandfatheringNav=80, saleNav=100)) = MAX(30, 80) = 80
      const result = applyGrandfathering(30, 80, 100)
      expect(result).toBe(80)
    })

    it('applyGrandfathering: grandfatheringNav higher than sale caps at sale price', () => {
      // MAX(50, MIN(120, 90)) = MAX(50, 90) = 90
      const result = applyGrandfathering(50, 120, 90)
      expect(result).toBe(90)
    })

    it('applyGrandfathering: missing NAV falls back to actual purchaseNav', () => {
      const result = applyGrandfathering(30, null, 100)
      expect(result).toBe(30)
    })
  })

  describe('getTaxAssetClass', () => {
    it('getTaxAssetClass: correctly classifies Large Cap Fund as equity', () => {
      expect(getTaxAssetClass('Large Cap Fund')).toBe('equity')
    })

    it('getTaxAssetClass: correctly classifies Liquid Fund as debt', () => {
      expect(getTaxAssetClass('Liquid Fund')).toBe('debt')
    })

    it('getTaxAssetClass: empty string defaults to debt', () => {
      expect(getTaxAssetClass('')).toBe('debt')
    })

    it('getTaxAssetClass: Aggressive Hybrid Fund returns hybrid_aggressive', () => {
      expect(getTaxAssetClass('Aggressive Hybrid Fund')).toBe('hybrid_aggressive')
    })
  })
})
