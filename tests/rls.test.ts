import { describe, it } from 'vitest'
import { createMockSupabase } from './setup'

describe('RLS isolation', () => {
  it.todo('user cannot read another user\'s family')
  it.todo('cross-family data access blocked at row level')
  it.todo('service role key bypasses RLS for admin operations')
  it.todo('holder data isolated to owning user\'s family')
})
