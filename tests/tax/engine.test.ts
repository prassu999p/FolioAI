import { describe, it, expect } from 'vitest'
import { buildTaxLots, depleteLots, computeTaxSummary } from '@/lib/tax/engine'

// Minimal transaction fixture
const makeTx = (
  folio: string,
  date: string,
  type: string,
  units: number,
  nav: number,
  schemeCode = 100
) => ({
  folio_id: folio,
  scheme_code: schemeCode,
  transaction_date: date,
  transaction_type: type,
  units,
  nav,
  amount: units * nav,
})

describe('Tax Engine', () => {
  describe('buildTaxLots', () => {
    it('buildTaxLots creates FIFO lot queue from transactions', () => {
      const txs = [
        makeTx('folio-1', '2021-06-01', 'purchase', 100, 50),
        makeTx('folio-1', '2022-01-15', 'purchase', 200, 75),
      ]
      const lots = buildTaxLots(txs)
      expect(lots).toHaveLength(2)
      // Sorted ascending by date
      expect(lots[0].purchaseDate).toEqual(new Date('2021-06-01'))
      expect(lots[0].remainingUnits).toBe(100)
      expect(lots[0].purchaseNav).toBe(50)
      expect(lots[1].purchaseDate).toEqual(new Date('2022-01-15'))
      expect(lots[1].remainingUnits).toBe(200)
    })

    it('buildTaxLots returns lots sorted by date ascending regardless of input order', () => {
      const txs = [
        makeTx('folio-1', '2022-03-01', 'purchase', 50, 90),
        makeTx('folio-1', '2020-01-01', 'purchase', 80, 30),
      ]
      const lots = buildTaxLots(txs)
      expect(lots[0].purchaseDate).toEqual(new Date('2020-01-01'))
      expect(lots[1].purchaseDate).toEqual(new Date('2022-03-01'))
    })
  })

  describe('depleteLots', () => {
    it('depleteLots consumes oldest lots first (FIFO)', () => {
      const lots = buildTaxLots([
        makeTx('folio-1', '2020-01-01', 'purchase', 100, 40),
        makeTx('folio-1', '2022-01-01', 'purchase', 200, 70),
      ])

      const redemption = makeTx('folio-1', '2023-06-01', 'redemption', 60, 100)
      const { updatedLots, realizedGains } = depleteLots(lots, redemption, 100, 'equity', false)

      // 60 units sold from oldest lot (which had 100 units)
      expect(realizedGains).toHaveLength(1)
      expect(realizedGains[0].soldUnits).toBe(60)
      expect(realizedGains[0].costBasis).toBe(40)

      // First lot should still have 40 units remaining, second untouched
      expect(updatedLots).toHaveLength(2)
      const firstLot = updatedLots.find(l => l.purchaseNav === 40)
      expect(firstLot?.remainingUnits).toBe(40)
    })

    it('depleteLots handles partial lot splitting across two lots', () => {
      const lots = buildTaxLots([
        makeTx('folio-1', '2020-01-01', 'purchase', 100, 40),
        makeTx('folio-1', '2022-01-01', 'purchase', 200, 70),
      ])

      // Sell 150 units: fully depletes first lot (100) + 50 from second
      const redemption = makeTx('folio-1', '2023-06-01', 'redemption', 150, 100)
      const { updatedLots, realizedGains } = depleteLots(lots, redemption, 100, 'equity', false)

      expect(realizedGains).toHaveLength(2)
      // First lot: 100 units fully consumed
      expect(realizedGains[0].soldUnits).toBe(100)
      expect(realizedGains[0].costBasis).toBe(40)
      // Second lot: 50 units consumed
      expect(realizedGains[1].soldUnits).toBe(50)
      expect(realizedGains[1].costBasis).toBe(70)

      // Only second lot remains with 150 units (200 - 50)
      expect(updatedLots).toHaveLength(1)
      expect(updatedLots[0].remainingUnits).toBe(150)
    })
  })

  describe('computeTaxSummary', () => {
    it('computeTaxSummary: equity fund held > 365 days produces LTCG', () => {
      const txs = [
        makeTx('folio-1', '2021-06-01', 'purchase', 100, 50),
        makeTx('folio-1', '2023-06-01', 'redemption', 100, 120),
      ]
      const assetClasses = new Map([[100, 'equity' as const]])
      const currentNavs = new Map([[100, 120]])
      const schemeNames = new Map([[100, 'Test Equity Fund']])

      const summary = computeTaxSummary({
        transactions: txs,
        grandfatheringNavs: new Map(),
        currentNavs,
        assetClasses,
        schemeNames,
        fyBounds: { start: new Date('2023-04-01'), end: new Date('2024-03-31') },
      })

      expect(summary.totalRealizedLTCG).toBeGreaterThan(0)
      expect(summary.totalRealizedSTCG).toBe(0)
    })

    it('grandfathering formula: purchaseNav=30 fmv=80 sale=100 → effectiveCostBasis=80', () => {
      const txs = [
        makeTx('folio-1', '2017-01-01', 'purchase', 100, 30),
        makeTx('folio-1', '2023-06-01', 'redemption', 100, 100),
      ]
      const assetClasses = new Map([[100, 'equity' as const]])
      const currentNavs = new Map([[100, 100]])
      const schemeNames = new Map([[100, 'Pre-2018 Fund']])
      const grandfatheringNavs = new Map([[100, 80]])

      const summary = computeTaxSummary({
        transactions: txs,
        grandfatheringNavs,
        currentNavs,
        assetClasses,
        schemeNames,
        fyBounds: { start: new Date('2023-04-01'), end: new Date('2024-03-31') },
      })

      // With grandfathering: effectiveCostBasis = MAX(30, MIN(80, 100)) = 80
      // gainPerUnit = 100 - 80 = 20, totalGain = 100 * 20 = 2000
      expect(summary.realizedGains).toHaveLength(1)
      expect(summary.realizedGains[0].costBasis).toBe(80)
      expect(summary.realizedGains[0].totalGain).toBe(2000)
    })

    it('missing grandfathering NAV falls back to actual purchaseNav', () => {
      const txs = [
        makeTx('folio-1', '2017-01-01', 'purchase', 100, 30),
        makeTx('folio-1', '2023-06-01', 'redemption', 100, 100),
      ]
      const assetClasses = new Map([[100, 'equity' as const]])
      const currentNavs = new Map([[100, 100]])
      const schemeNames = new Map([[100, 'Pre-2018 Fund']])

      const summary = computeTaxSummary({
        transactions: txs,
        grandfatheringNavs: new Map(), // No grandfathering NAV provided
        currentNavs,
        assetClasses,
        schemeNames,
      })

      // Without grandfathering: effectiveCostBasis = 30
      // gainPerUnit = 100 - 30 = 70, totalGain = 100 * 70 = 7000
      expect(summary.realizedGains[0].costBasis).toBe(30)
      expect(summary.realizedGains[0].totalGain).toBe(7000)
    })
  })
})
