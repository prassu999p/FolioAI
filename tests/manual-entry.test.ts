import { describe, it } from 'vitest'
import { createMockSupabase } from './setup'

describe('Manual holding entry (DATA-04)', () => {
  it.todo('valid entry creates transaction in database')
  it.todo('missing required field returns validation error')
  it.todo('negative units rejected with validation error')
  it.todo('future date rejected with validation error')
})
