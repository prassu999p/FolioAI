import { describe, it } from 'vitest'
import { createMockSupabase } from './setup'

describe('Transaction deduplication', () => {
  it.todo('re-importing same CAS does not double transactions')
  it.todo('dedup key is (holder_id, scheme_code, transaction_date, units, nav)')
  it.todo('partial re-import (new transactions only) correctly appends')
  it.todo('conflicting import with different NAV raises error, not silent overwrite')
})
