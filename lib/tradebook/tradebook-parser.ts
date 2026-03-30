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
import { COLUMN_ALIASES } from './tradebook-column-mapper'

/**
 * Detects which row contains the actual column headers by looking for
 * known column alias patterns. Returns the header row index (0-based).
 */
function detectHeaderRow(sheet: XLSX.WorkSheet): number {
  const allRows = XLSX.utils.sheet_to_json(sheet, {
    header: 1, // Get raw array format [[col1, col2, ...], ...]
    defval: '',
    raw: false,
  }) as string[][]

  // Known keywords that appear in column headers (case-insensitive)
  const knownKeywords = new Set<string>()
  for (const aliases of Object.values(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      knownKeywords.add(alias.toLowerCase())
    }
  }

  // Scan rows to find the one with the most header matches
  let bestRowIndex = 0
  let bestMatchCount = 0

  for (let i = 0; i < allRows.length && i < 10; i++) {
    const row = allRows[i]
    if (!Array.isArray(row)) continue

    let matchCount = 0
    for (const cell of row) {
      const cellStr = String(cell).toLowerCase().trim()
      if (cellStr && knownKeywords.has(cellStr)) {
        matchCount++
      }
    }

    if (matchCount > bestMatchCount) {
      bestMatchCount = matchCount
      bestRowIndex = i
    }
  }

  // If we found at least 2 header matches, use that row; otherwise default to 0
  return bestMatchCount >= 2 ? bestRowIndex : 0
}

/**
 * parseSpreadsheet
 *
 * Parses a File object (CSV, XLS, or XLSX) into an array of raw row objects.
 * Auto-detects the header row by scanning for known column patterns.
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

  // Auto-detect header row
  const headerRowIndex = detectHeaderRow(sheet)

  // Parse with the detected header row
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: '',
    raw: false,
    range: headerRowIndex, // Skip rows before the header
  })

  return rows
}
