/**
 * tradebook-parser.ts
 *
 * Parses a broker tradebook file (CSV, XLS, XLSX) into an array of raw row
 * objects using SheetJS.
 *
 * Responsibilities:
 *  - Read the file buffer using XLSX.read
 *  - Extract rows from the first sheet using sheet_to_json
 *  - Return raw rows as Record<string, string>[] without any normalisation
 *
 * Column normalisation is handled by tradebook-column-mapper.ts.
 * Row validation is handled by tradebook-validator.ts.
 */

import * as XLSX from 'xlsx'

/**
 * parseSpreadsheet
 *
 * Parses a File object (CSV, XLS, or XLSX) into an array of raw row objects.
 * Each row has keys taken verbatim from the spreadsheet header row.
 *
 * @param file - A browser File object (or Node.js File-like object with arrayBuffer())
 * @returns Promise resolving to array of raw row objects
 * @throws Error if file cannot be parsed or has no sheets
 */
export async function parseSpreadsheet(
  file: File
): Promise<Record<string, string>[]> {
  const buffer = await file.arrayBuffer()

  const workbook = XLSX.read(buffer, {
    cellDates: true,
    raw: false,
  })

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new Error('Spreadsheet has no sheets')
  }

  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in workbook`)
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: '',
    raw: false,
  })

  return rows
}
