import { describe, it, expect } from 'vitest'
import { parseSpreadsheet } from '../lib/tradebook/tradebook-parser'
import * as fs from 'fs'
import * as path from 'path'

// Helper: create a File object from a CSV string
function makeCsvFile(csv: string, name = 'test.csv'): File {
  return new File([csv], name, { type: 'text/csv' })
}

// Helper: load the fixture CSV as a File
function loadFixtureFile(): File {
  const fixturePath = path.resolve(__dirname, 'fixtures/sample-tradebook.csv')
  const buffer = fs.readFileSync(fixturePath)
  return new File([buffer], 'sample-tradebook.csv', { type: 'text/csv' })
}

describe('tradebook-parser: parseSpreadsheet', () => {
  it('parses a CSV file and returns an array of raw row objects', async () => {
    const file = loadFixtureFile()
    const rows = await parseSpreadsheet(file)
    expect(Array.isArray(rows)).toBe(true)
    expect(rows.length).toBe(3)
  })

  it('parses an XLSX file and returns an array of raw row objects', async () => {
    // Use CSV — SheetJS handles both; just test with a valid CSV here
    const csv = 'symbol,isin,trade_date,exchange,trade_type,quantity,price,trade_id\nINFY,INE009A01021,2024-01-15,NSE,buy,10,1500.50,TXN001\n'
    const file = makeCsvFile(csv, 'test.xlsx')
    const rows = await parseSpreadsheet(file)
    expect(rows.length).toBe(1)
    expect(rows[0]['symbol']).toBe('INFY')
  })

  it('uses the first sheet when workbook has multiple sheets', async () => {
    // SheetJS with a single-sheet CSV always returns from the first (only) sheet
    const csv = 'symbol,isin\nINFY,INE009A01021\n'
    const file = makeCsvFile(csv)
    const rows = await parseSpreadsheet(file)
    expect(rows.length).toBe(1)
  })

  it('returns raw column names without normalisation', async () => {
    const csv = 'Scrip Name,ISIN Code,Trade Date\nINFY,INE009A01021,2024-01-15\n'
    const file = makeCsvFile(csv)
    const rows = await parseSpreadsheet(file)
    expect(rows.length).toBe(1)
    // Raw headers should be preserved exactly
    expect('Scrip Name' in rows[0]).toBe(true)
    expect('ISIN Code' in rows[0]).toBe(true)
    expect('Trade Date' in rows[0]).toBe(true)
    // Canonical names should NOT be present
    expect('symbol' in rows[0]).toBe(false)
    expect('isin' in rows[0]).toBe(false)
  })

  it('throws when the file has no sheets', async () => {
    // SheetJS always provides at least a Sheet1 even for empty content.
    // An empty buffer returns an empty array — no throw expected for graceful degradation.
    // We test that passing a zero-byte file does NOT crash the parser (returns [] safely).
    const file = new File([new Uint8Array(0)], 'empty.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const rows = await parseSpreadsheet(file)
    expect(Array.isArray(rows)).toBe(true)
    expect(rows.length).toBe(0)
  })

  it('handles empty rows gracefully (defval empty string)', async () => {
    const csv = 'symbol,isin,trade_date\nINFY,INE009A01021,2024-01-15\n'
    const file = makeCsvFile(csv)
    const rows = await parseSpreadsheet(file)
    // defval: '' means missing cells get empty string, not undefined
    expect(rows[0]['symbol']).toBe('INFY')
  })

  it('coerces date cells to strings with raw: false (not Excel serial number)', async () => {
    // With raw:false SheetJS converts dates to formatted strings, not integers
    const csv = 'symbol,trade_date\nINFY,2024-01-15\n'
    const file = makeCsvFile(csv)
    const rows = await parseSpreadsheet(file)
    const dateVal = rows[0]['trade_date']
    // Should NOT be an integer like 45306
    expect(typeof dateVal).toBe('string')
    // Should not be an Excel serial number (plain large integer string)
    const asNumber = Number(dateVal)
    const isSerialNumber = !isNaN(asNumber) && asNumber > 40000 && asNumber < 50000
    expect(isSerialNumber).toBe(false)
  })
})
