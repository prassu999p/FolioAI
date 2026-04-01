import { describe, it } from 'vitest'

describe('tradebook dedup logic', () => {
  it.todo('duplicate trade_id is skipped — re-upload returns skipped count, not imported count')
  it.todo('unique trade_id is inserted — first upload returns imported count > 0')
  it.todo('re-upload of same file: imported = 0, skipped = total valid rows')
})
