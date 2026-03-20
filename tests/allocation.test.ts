import { describe, it } from 'vitest'
// Future imports (created in Plan 02):
// import { AllocationTargetSchema } from '@/lib/analytics/asset-class-mapper'
// import { mapCategoryToAssetClass } from '@/lib/analytics/asset-class-mapper'

describe('AllocationTargetSchema', () => {
  it.todo('accepts valid allocation summing to 100')
  it.todo('rejects allocation summing to more than 100')
  it.todo('accepts partial allocation summing to less than 100')
})

describe('mapCategoryToAssetClass', () => {
  it.todo('Equity Schemes → equity')
  it.todo('Debt Schemes → debt')
  it.todo('Gold ETF → gold')
  it.todo('International FoF → international')
  it.todo('unknown category falls back to equity')
})
