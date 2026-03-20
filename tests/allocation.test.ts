import { describe, it, expect } from 'vitest'
import { AllocationTargetSchema, mapCategoryToAssetClass } from '@/lib/analytics/asset-class-mapper'

describe('AllocationTargetSchema', () => {
  it('accepts valid allocation summing to 100', () => {
    const result = AllocationTargetSchema.safeParse({
      equity: 60,
      debt: 30,
      gold: 5,
      international: 5,
    })
    expect(result.success).toBe(true)
  })

  it('rejects allocation summing to more than 100', () => {
    const result = AllocationTargetSchema.safeParse({
      equity: 60,
      debt: 30,
      gold: 10,
      international: 5, // total = 105
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toContain('100%')
  })

  it('accepts partial allocation summing to less than 100 (unclassified/cash allowed)', () => {
    const result = AllocationTargetSchema.safeParse({
      equity: 50,
      debt: 30,
      gold: 5,
      international: 0, // total = 85 — rest is unclassified/cash
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative values', () => {
    const result = AllocationTargetSchema.safeParse({
      equity: -10,
      debt: 30,
      gold: 5,
      international: 5,
    })
    expect(result.success).toBe(false)
  })

  it('rejects values over 100 per field', () => {
    const result = AllocationTargetSchema.safeParse({
      equity: 150,
      debt: 0,
      gold: 0,
      international: 0,
    })
    expect(result.success).toBe(false)
  })
})

describe('mapCategoryToAssetClass', () => {
  it('Equity Schemes → equity', () => {
    expect(mapCategoryToAssetClass('Equity Schemes')).toBe('equity')
    expect(mapCategoryToAssetClass('Large Cap Fund')).toBe('equity')
    expect(mapCategoryToAssetClass('ELSS')).toBe('equity')
    expect(mapCategoryToAssetClass('Multi Cap Fund')).toBe('equity')
  })

  it('Debt Schemes → debt', () => {
    expect(mapCategoryToAssetClass('Debt Schemes')).toBe('debt')
    expect(mapCategoryToAssetClass('Liquid Fund')).toBe('debt')
    expect(mapCategoryToAssetClass('Short Duration Fund')).toBe('debt')
    expect(mapCategoryToAssetClass('Gilt Fund')).toBe('debt')
  })

  it('Gold ETF → gold', () => {
    expect(mapCategoryToAssetClass('Gold ETF')).toBe('gold')
    expect(mapCategoryToAssetClass('Gold Fund of Fund')).toBe('gold')
    expect(mapCategoryToAssetClass('Silver ETF')).toBe('gold') // Silver included per research
  })

  it('International FoF → international', () => {
    expect(mapCategoryToAssetClass('International FoF')).toBe('international')
    expect(mapCategoryToAssetClass('Overseas Fund')).toBe('international')
    expect(mapCategoryToAssetClass('Global Equity Fund')).toBe('international')
  })

  it('unknown category falls back to equity', () => {
    expect(mapCategoryToAssetClass('Unknown Hybrid Scheme')).toBe('equity')
    expect(mapCategoryToAssetClass('')).toBe('equity')
  })

  it('case-insensitive matching', () => {
    expect(mapCategoryToAssetClass('GOLD ETF')).toBe('gold')
    expect(mapCategoryToAssetClass('LIQUID FUND')).toBe('debt')
    expect(mapCategoryToAssetClass('large cap fund')).toBe('equity')
  })

  it('gold takes priority over international when both keywords match', () => {
    // e.g., "Gold International FoF" — gold should win (more specific)
    expect(mapCategoryToAssetClass('Gold International FoF')).toBe('gold')
  })
})
