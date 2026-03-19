import { describe, it } from 'vitest'
import { createMockSupabase } from './setup'

describe('NAV sync (DATA-06)', () => {
  it.todo('calls mfapi.in endpoint per held scheme')
  it.todo('retries 3 times on transient failure')
  it.todo('upserts nav_prices with nav_date as conflict key')
  it.todo('skips schemes with no active holdings')
  it.todo('falls back to AMFI file scraping when mfapi.in unavailable')
})
