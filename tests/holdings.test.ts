import { describe, it } from 'vitest'
import { createMockSupabase, TEST_HOLDER_ID } from './setup'

describe('Holdings list (DATA-05)', () => {
  it.todo('aggregates units by scheme_code across transactions')
  it.todo('joins latest NAV from nav_prices table')
  it.todo('empty holder returns empty array')
  it.todo('redeemed holding (zero units) excluded from active list')
})
