import { describe, it } from 'vitest'
import { parseSpreadsheet } from '../lib/tradebook/tradebook-parser'

// Silence unused import warning — parseSpreadsheet will be used in Plan 02 tests
void parseSpreadsheet

describe('tradebook-parser: parseSpreadsheet', () => {
  it.todo('parses a CSV file and returns an array of raw row objects')
  it.todo('parses an XLSX file and returns an array of raw row objects')
  it.todo('uses the first sheet when workbook has multiple sheets')
  it.todo('returns raw column names without normalisation')
  it.todo('throws when the file has no sheets')
  it.todo('handles empty rows gracefully (defval empty string)')
  it.todo('coerces date cells to strings with raw: false')
})
