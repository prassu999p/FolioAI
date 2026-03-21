import { describe, it, expect } from 'vitest'

describe('Tax Engine', () => {
  it.todo('buildTaxLots creates FIFO lot queue from transactions')
  it.todo('depleteLots consumes oldest lots first (FIFO)')
  it.todo('depleteLots handles partial lot splitting')
  it.todo('computeUnrealizedGains calculates current gains')
  it.todo('computeTaxSummary aggregates LTCG/STCG correctly')
  it.todo('grandfathering formula MAX(actual, MIN(jan31NAV, sale)) applied')
  it.todo('missing grandfathering NAV falls back to actual cost')
})
