import { describe, it, expect } from 'vitest'

describe('Tax Rules', () => {
  it.todo('classifyGain: equity held >= 365 days = LTCG at 12.5%')
  it.todo('classifyGain: equity held < 365 days = STCG at 20%')
  it.todo('classifyGain: debt post-Apr 2023 = SLAB (no fixed rate)')
  it.todo('classifyGain: debt pre-Apr 2023 >= 24 months = LTCG')
  it.todo('applyGrandfathering: pre-2018 uses MAX/MIN formula')
  it.todo('applyGrandfathering: missing NAV falls back to actual')
  it.todo('getTaxAssetClass: correctly classifies fund categories')
})
