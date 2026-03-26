/**
 * Tests for SellTaxEstimatorModal real lot data wiring
 *
 * These tests verify the tax estimation logic used by the modal with real props:
 * purchaseDate, grandfatheringNav, taxAssetClass passed from HoldingsTable.
 *
 * Tests run against the pure estimateSellTax engine + getTaxAssetClass rules
 * (no DOM/React rendering required — logic is pure TS).
 */

import { describe, it, expect } from 'vitest'
import { estimateSellTax } from '@/lib/tax/engine'
import { getTaxAssetClass } from '@/lib/tax/rules'

describe('SellTaxEstimatorModal — real lot data logic', () => {
  describe('pre-2018 holding with grandfathering', () => {
    it('classifies LTCG and has holdingDays > 3000 when purchaseDate is 2015-01-01', () => {
      const purchaseDate = new Date('2015-01-01')
      // grandfatheringNav < purchaseNav: engine formula: max(purchaseNav, min(gNav, saleNav))
      // When gNav (25) < purchaseNav (30): max(30, 25) = 30 → purchaseNav wins, engine marks grandfatheringApplied=true
      const grandfatheringNav = 25
      const purchaseNav = 30
      const saleNav = 200
      const units = 100
      const taxAssetClass = getTaxAssetClass('Equity Large Cap')

      const isPostApr2023 = purchaseDate >= new Date('2023-04-01')

      const result = estimateSellTax({
        purchaseDate,
        purchaseNav,
        units,
        saleNav,
        grandfatheringNav,
        assetClass: taxAssetClass,
        isPostApr2023,
      })

      expect(result.ltcgGain).toBeGreaterThan(0)
      expect(result.grandfatheringApplied).toBe(true)
      expect(result.holdingDays).toBeGreaterThan(3000)
    })
  })

  describe('equity held > 365 days', () => {
    it('classifies as LTCG with 12.5% rate', () => {
      // Use a purchase date >365 days ago
      const purchaseDate = new Date('2022-06-01')
      const taxAssetClass = getTaxAssetClass('Equity Large Cap')
      const isPostApr2023 = purchaseDate >= new Date('2023-04-01')

      const result = estimateSellTax({
        purchaseDate,
        purchaseNav: 150,
        units: 10,
        saleNav: 200,
        grandfatheringNav: null,
        assetClass: taxAssetClass,
        isPostApr2023,
      })

      // purchase date 2022-06-01 is well beyond 365 days from now (2026-03-26)
      expect(result.ltcgClassification).toBe('LTCG')
      expect(result.ltcgRate).toBe(0.125)
      expect(result.stcgRate).toBeNull()
      expect(result.ltcgGain).toBeGreaterThan(0)
    })
  })

  describe('equity held < 365 days', () => {
    it('classifies as STCG with 20% rate', () => {
      // Purchase date less than 365 days ago
      const purchaseDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) // 100 days ago
      const taxAssetClass = getTaxAssetClass('Equity Large Cap')
      const isPostApr2023 = purchaseDate >= new Date('2023-04-01')

      const result = estimateSellTax({
        purchaseDate,
        purchaseNav: 150,
        units: 10,
        saleNav: 200,
        grandfatheringNav: null,
        assetClass: taxAssetClass,
        isPostApr2023,
      })

      expect(result.stcgClassification).toBe('STCG')
      expect(result.stcgRate).toBe(0.20)
      expect(result.ltcgRate).toBeNull()
      expect(result.stcgGain).toBeGreaterThan(0)
    })
  })

  describe('debt fund post-Apr2023', () => {
    it('classifies as SLAB with no fixed rate', () => {
      const purchaseDate = new Date('2023-10-01')
      const taxAssetClass = getTaxAssetClass('Debt Short Duration')
      const isPostApr2023 = purchaseDate >= new Date('2023-04-01')

      const result = estimateSellTax({
        purchaseDate,
        purchaseNav: 100,
        units: 50,
        saleNav: 110,
        grandfatheringNav: null,
        assetClass: taxAssetClass,
        isPostApr2023,
      })

      // SLAB: no fixed tax rate
      expect(result.stcgClassification).toBe('SLAB')
      expect(result.stcgRate).toBeNull()
      expect(result.ltcgRate).toBeNull()
    })
  })

  describe('getTaxAssetClass', () => {
    it('returns equity for Equity Large Cap', () => {
      expect(getTaxAssetClass('Equity Large Cap')).toBe('equity')
    })

    it('returns debt for empty string (conservative fallback)', () => {
      expect(getTaxAssetClass('')).toBe('debt')
    })
  })
})
