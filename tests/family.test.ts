import { describe, it } from 'vitest'
import { createMockSupabase, TEST_FAMILY_ID } from './setup'

describe('Family management (FAM-01)', () => {
  it.todo('create family returns family record with user_id')
  it.todo('add holder to family with name and PAN')
  it.todo('duplicate PAN in same family returns error')
})

describe('Family dashboard AUM (FAM-02)', () => {
  it.todo('total AUM sums current_value across all holders')
  it.todo('empty family returns AUM of 0')
})

describe('Holder drill-down (FAM-03)', () => {
  it.todo('holder holdings query filters by holder_id')
})
