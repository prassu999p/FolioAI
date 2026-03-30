'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { parseSpreadsheet } from '@/lib/tradebook/tradebook-parser'
import { COLUMN_ALIASES, normaliseHeaders } from '@/lib/tradebook/tradebook-column-mapper'
import { validateRow } from '@/lib/tradebook/tradebook-validator'
import type { ValidatedRow } from '@/lib/tradebook/tradebook-validator'

// ─── Types ─────────────────────────────────────────────────────────────────

interface DetectedMapping {
  rawHeader: string
  canonicalKey: string
  status: 'auto' | 'unknown'
}

interface RowWithStatus {
  raw: Record<string, unknown>
  valid: boolean
  data?: ValidatedRow
  errors?: string[]
}

interface ImportResult {
  imported: number
  skipped: number
  batched: string
}

interface FileToProcess {
  file: File
  status: 'pending' | 'processing' | 'done' | 'error'
  result?: ImportResult
  error?: string
  rawRows?: Record<string, string>[]
}

type ParseState = 'idle' | 'parsing' | 'mapping' | 'previewing' | 'importing' | 'done'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatINR(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

/** Build a reverse lookup: lowercased raw header → canonical key */
function buildReverseLookup(): Map<string, string> {
  const map = new Map<string, string>()
  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      map.set(alias.toLowerCase(), canonical)
    }
  }
  return map
}

const REQUIRED_COLUMNS = ['symbol', 'isin', 'trade_date', 'exchange', 'trade_type', 'quantity', 'price']

function detectMappings(rawHeaders: string[]): DetectedMapping[] {
  const reverseLookup = buildReverseLookup()
  return rawHeaders.map((rawHeader) => {
    const canonical = reverseLookup.get(rawHeader.toLowerCase().trim())
    return {
      rawHeader,
      canonicalKey: canonical ?? rawHeader,
      status: canonical !== undefined ? 'auto' : 'unknown',
    }
  })
}

// ─── Component ───────────────────────────────────────────────────────────────

interface TradebookImportFormProps {
  familyId: string
  holders: Array<{ id: string; name: string }>
}

export default function TradebookImportForm({ familyId, holders }: TradebookImportFormProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [selectedHolderId, setSelectedHolderId] = useState<string>('')
  const [filesToProcess, setFilesToProcess] = useState<FileToProcess[]>([])
  const [parseState, setParseState] = useState<ParseState>('idle')
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [detectedMappings, setDetectedMappings] = useState<DetectedMapping[]>([])
  const [rowResults, setRowResults] = useState<RowWithStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── File selection handler ─────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length === 0) return

    setError(null)
    setFilesToProcess(selected.map(file => ({ file, status: 'pending' })))
    setParseState('parsing')
    setCurrentFileIndex(0)

    // Parse the first file
    await parseAndPreviewFile(selected[0])
  }

  async function parseAndPreviewFile(file: File) {
    try {
      const rows = await parseSpreadsheet(file)
      setRawRows(rows)

      if (rows.length === 0) {
        setError(`No rows found in ${file.name}. Please check the file format.`)
        setParseState('idle')
        return
      }

      // Detect column mappings from the first row's keys
      const headers = Object.keys(rows[0])
      const mappings = detectMappings(headers)
      setDetectedMappings(mappings)
      setParseState('mapping')
    } catch (err) {
      setError(`Failed to parse ${file.name}. Please ensure it is a valid CSV or XLSX.`)
      setParseState('idle')
    }
  }

  // ─── Confirm mappings → build row validation results ───────────────────

  function handleConfirmMappings() {
    const results: RowWithStatus[] = rawRows.map((rawRow) => {
      const normalised = normaliseHeaders(rawRow)
      const validation = validateRow(normalised)
      return {
        raw: rawRow,
        valid: validation.valid,
        data: validation.valid ? validation.data : undefined,
        errors: !validation.valid ? validation.errors : undefined,
      }
    })

    setRowResults(results)
    setParseState('previewing')
  }

  // ─── Import handler ─────────────────────────────────────────────────────

  async function handleImport() {
    const validRows = rowResults.filter((r) => r.valid && r.data).map((r) => r.data!)
    if (validRows.length === 0 || !selectedHolderId) return

    setLoading(true)
    setError(null)
    setParseState('importing')

    // Import all files sequentially
    const currentFile = filesToProcess[currentFileIndex]?.file
    if (!currentFile) return

    const batchId = crypto.randomUUID()

    try {
      const res = await fetch('/api/holdings/import-tradebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holderId: selectedHolderId,
          filename: currentFile.name,
          batchId,
          rows: validRows,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? `Import failed for ${currentFile.name}. Please try again.`)
        updateFileStatus(currentFileIndex, 'error', undefined, data.error)
        return
      }

      // Mark this file as done
      updateFileStatus(currentFileIndex, 'done', data as ImportResult)

      // If there are more files, process the next one
      if (currentFileIndex + 1 < filesToProcess.length) {
        setCurrentFileIndex(currentFileIndex + 1)
        await parseAndPreviewFile(filesToProcess[currentFileIndex + 1].file)
      } else {
        // All files processed
        setParseState('done')
        setTimeout(() => {
          router.push(`/families/${familyId}/holdings`)
        }, 1500)
      }
    } catch {
      setError('Network error — please try again.')
      updateFileStatus(currentFileIndex, 'error', undefined, 'Network error')
    } finally {
      setLoading(false)
    }
  }

  function updateFileStatus(index: number, status: 'pending' | 'processing' | 'done' | 'error', result?: ImportResult, error?: string) {
    setFilesToProcess(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], status, result, error }
      return updated
    })
  }

  // ─── Reset ──────────────────────────────────────────────────────────────

  function handleReset() {
    setParseState('idle')
    setFilesToProcess([])
    setCurrentFileIndex(0)
    setRawRows([])
    setDetectedMappings([])
    setRowResults([])
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ─── Derived state ──────────────────────────────────────────────────────

  const validRows = rowResults.filter((r) => r.valid)
  const invalidRows = rowResults.filter((r) => !r.valid)

  const mappedCanonicalKeys = detectedMappings
    .filter((m) => m.status === 'auto')
    .map((m) => m.canonicalKey)

  const missingRequiredCols = REQUIRED_COLUMNS.filter(
    (col) => !mappedCanonicalKeys.includes(col)
  )

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="px-8 py-8 max-w-2xl mx-auto">

      {/* Success banner */}
      {parseState === 'done' && (
        <div className="space-y-2 mb-6">
          <div
            className="rounded-xl px-4 py-3 text-sm flex gap-2 items-center"
            style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}
          >
            <span className="material-symbols-outlined text-base">check_circle</span>
            All files imported successfully! Redirecting…
          </div>
          {filesToProcess.map((file, idx) => (
            file.status === 'done' && file.result && (
              <div key={idx} className="text-xs px-3 py-2 bg-green-50 rounded" style={{ color: '#15803d' }}>
                <span className="font-medium">{file.file.name}:</span> {file.result.imported} stocks imported ({file.result.skipped} duplicates skipped)
              </div>
            )
          ))}
        </div>
      )}

      {/* Error in importing */}
      {parseState === 'importing' && filesToProcess.some(f => f.status === 'error') && (
        <div
          className="rounded-xl px-4 py-3 text-sm flex gap-2 items-center mb-6"
          style={{ backgroundColor: '#fef2f2', color: '#991b1b' }}
        >
          <span className="material-symbols-outlined text-base">error</span>
          Import failed for {filesToProcess.find(f => f.status === 'error')?.file.name}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm flex gap-2 items-center mb-6"
          style={{ backgroundColor: '#fef2f2', color: '#991b1b' }}
        >
          <span className="material-symbols-outlined text-base">error</span>
          {error}
        </div>
      )}

      {/* Instructions */}
      <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: '#e6f6ff' }}>
        <div className="flex gap-3 items-start">
          <span className="material-symbols-outlined mt-0.5" style={{ color: '#006d43' }}>info</span>
          <div>
            <p className="font-semibold text-sm mb-1" style={{ color: '#001f2a' }}>
              Import from Tradebook
            </p>
            <p className="text-sm" style={{ color: '#43474f' }}>
              Download your tradebook from Zerodha Console (Reports → Tradebook) or your broker&apos;s portal.
              Supports CSV and XLSX formats. Duplicate rows from re-uploads are automatically skipped.
            </p>
          </div>
        </div>
      </div>

      {/* Step 1 — Holder dropdown + file picker */}
      {parseState === 'idle' || parseState === 'parsing' ? (
        <div className="space-y-6">
          {/* Holder dropdown */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#001f2a' }}>
              Family Member
            </label>
            {holders.length === 0 ? (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ backgroundColor: '#fef9c3', color: '#854d0e' }}
              >
                No holders found in this family. Add a holder before importing.
              </div>
            ) : (
              <select
                value={selectedHolderId}
                onChange={(e) => setSelectedHolderId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2"
                style={{
                  borderColor: '#c9e7f7',
                  backgroundColor: '#ffffff',
                  color: selectedHolderId ? '#001f2a' : '#43474f',
                }}
              >
                <option value="" disabled>Select family member</option>
                {holders.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* File picker */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#001f2a' }}>
              Tradebook File
            </label>
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-[#006d43]"
              style={{
                borderColor: filesToProcess.length > 0 ? '#006d43' : '#43474f',
                opacity: !selectedHolderId ? 0.5 : 1,
                pointerEvents: !selectedHolderId ? 'none' : 'auto',
              }}
              onClick={() => fileRef.current?.click()}
            >
              <span
                className="material-symbols-outlined text-4xl mb-2 block"
                style={{ color: parseState === 'parsing' ? '#006d43' : '#43474f' }}
              >
                {parseState === 'parsing' ? 'progress_activity' : 'upload_file'}
              </span>
              <p className="text-sm font-medium" style={{ color: '#001f2a' }}>
                {parseState === 'parsing'
                  ? 'Parsing file…'
                  : filesToProcess.length > 0
                  ? `${filesToProcess.length} file${filesToProcess.length !== 1 ? 's' : ''} selected`
                  : 'Click to select CSV or XLSX'}
              </p>
              {filesToProcess.length === 0 && parseState === 'idle' && (
                <p className="text-xs mt-1" style={{ color: '#43474f' }}>
                  .csv and .xlsx formats supported — select multiple files
                </p>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx"
                multiple
                className="hidden"
                onChange={handleFileChange}
                disabled={!selectedHolderId}
              />
            </div>
            {!selectedHolderId && (
              <p className="text-xs mt-1" style={{ color: '#43474f' }}>
                Select a family member first to enable file upload.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {/* Step 2 — Column mapping confirmation */}
      {parseState === 'mapping' && filesToProcess.length > 0 && (
        <div>
          {/* File info with progress */}
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-base" style={{ color: '#006d43' }}>
              check_circle
            </span>
            <span className="text-sm font-medium" style={{ color: '#001f2a' }}>{filesToProcess[currentFileIndex]?.file.name}</span>
            <span className="text-xs" style={{ color: '#43474f' }}>
              • {rawRows.length} rows detected
            </span>
            {filesToProcess.length > 1 && (
              <span className="text-xs ml-auto" style={{ color: '#43474f' }}>
                File {currentFileIndex + 1} of {filesToProcess.length}
              </span>
            )}
          </div>

          {/* Mapping confirmation panel */}
          <div
            className="rounded-xl border p-4 mb-4"
            style={{ borderColor: '#c9e7f7', backgroundColor: '#f4faff' }}
          >
            <p className="text-sm font-semibold mb-3" style={{ color: '#001736' }}>
              <span className="material-symbols-outlined text-base align-middle mr-1">table_view</span>
              Detected column mappings
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase" style={{ color: '#43474f' }}>
                  <th className="text-left pb-1 pr-4">File column</th>
                  <th className="text-left pb-1 pr-4">Maps to</th>
                  <th className="text-left pb-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {detectedMappings.map((m) => (
                  <tr key={m.rawHeader}>
                    <td className="py-0.5 pr-4 font-mono text-xs">{m.rawHeader}</td>
                    <td className="py-0.5 pr-4">{m.canonicalKey}</td>
                    <td className="py-0.5">
                      {m.status === 'auto' ? (
                        <span style={{ color: '#006d43' }}>Auto-detected</span>
                      ) : (
                        <span style={{ color: '#b45309' }}>Unknown — will be ignored</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Required columns summary */}
            <div className="mt-3 pt-3 border-t" style={{ borderColor: '#c9e7f7' }}>
              {missingRequiredCols.length === 0 ? (
                <p className="text-xs font-semibold" style={{ color: '#006d43' }}>
                  <span className="material-symbols-outlined text-sm align-middle mr-1">check_circle</span>
                  All required columns detected.
                </p>
              ) : (
                <div>
                  {missingRequiredCols.map((col) => (
                    <p key={col} className="text-xs" style={{ color: '#b45309' }}>
                      <span className="material-symbols-outlined text-sm align-middle mr-1">warning</span>
                      Warning: required column &apos;{col}&apos; not detected — those rows will be invalid.
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleConfirmMappings}
                className="px-4 py-1.5 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: '#001736' }}
              >
                Confirm mappings
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-1.5 rounded-xl text-sm border"
                style={{ color: '#001736', borderColor: '#c9e7f7' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 — Row-data preview table */}
      {parseState === 'previewing' && filesToProcess.length > 0 && (
        <div>
          {/* File info with progress */}
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-base" style={{ color: '#006d43' }}>
              check_circle
            </span>
            <span className="text-sm font-medium" style={{ color: '#001f2a' }}>{filesToProcess[currentFileIndex]?.file.name}</span>
            {filesToProcess.length > 1 && (
              <span className="text-xs" style={{ color: '#43474f' }}>
                • File {currentFileIndex + 1} of {filesToProcess.length}
              </span>
            )}
            <button
              onClick={handleReset}
              className="ml-auto text-xs border rounded-xl px-3 py-1"
              style={{ color: '#001736', borderColor: '#c9e7f7' }}
            >
              Change files
            </button>
          </div>

          {/* Row counts */}
          <p className="text-sm font-semibold mb-3" style={{ color: '#001f2a' }}>
            <span style={{ color: '#006d43' }}>{validRows.length} valid rows</span>
            {invalidRows.length > 0 && (
              <> &bull; <span style={{ color: '#991b1b' }}>{invalidRows.length} will be skipped</span></>
            )}
          </p>

          {/* Preview table */}
          <div className="rounded-3xl border overflow-hidden mb-6" style={{ borderColor: '#c9e7f7' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#e6f6ff' }}>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#43474f' }}>Symbol</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#43474f' }}>ISIN</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#43474f' }}>Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#43474f' }}>Type</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tabular-nums" style={{ color: '#43474f' }}>Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tabular-nums" style={{ color: '#43474f' }}>Price</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#43474f' }}>Trade ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#43474f' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rowResults.map((row, i) => {
                    const normalised = normaliseHeaders(row.raw)
                    return (
                      <tr
                        key={i}
                        style={{
                          backgroundColor: row.valid ? (i % 2 === 0 ? '#ffffff' : '#f4faff') : '#fef2f2',
                        }}
                      >
                        <td className="px-4 py-2 font-mono text-xs font-medium tabular-nums" style={{ color: '#001f2a' }}>
                          {row.data?.symbol ?? String(normalised.symbol ?? '')}
                        </td>
                        <td className="px-4 py-2 text-xs font-mono tabular-nums" style={{ color: '#43474f' }}>
                          {row.data?.isin ?? String(normalised.isin ?? '')}
                        </td>
                        <td className="px-4 py-2 text-xs tabular-nums" style={{ color: '#001f2a' }}>
                          {row.data?.trade_date ?? String(normalised.trade_date ?? '')}
                        </td>
                        <td className="px-4 py-2 text-xs" style={{ color: '#001f2a' }}>
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: row.data?.trade_type === 'buy' ? '#dcfce7' : '#fef2f2',
                              color: row.data?.trade_type === 'buy' ? '#15803d' : '#991b1b',
                            }}
                          >
                            {row.data?.trade_type ?? String(normalised.trade_type ?? '')}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-xs" style={{ color: '#001f2a' }}>
                          {row.data?.quantity?.toFixed(2) ?? String(normalised.quantity ?? '')}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-xs" style={{ color: '#001f2a' }}>
                          {row.data?.price !== undefined ? formatINR(row.data.price) : String(normalised.price ?? '')}
                        </td>
                        <td className="px-4 py-2 text-xs font-mono" style={{ color: '#43474f' }}>
                          {row.data?.trade_id ?? String(normalised.trade_id ?? '—')}
                        </td>
                        <td className="px-4 py-2 text-xs" style={{ color: row.valid ? '#006d43' : '#991b1b' }}>
                          {row.valid ? 'Valid' : (row.errors ?? []).join('; ')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import button */}
          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm flex gap-2 items-center mb-4"
              style={{ backgroundColor: '#fef2f2', color: '#991b1b' }}
            >
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </div>
          )}

          {/* File queue status (if multiple files) */}
          {filesToProcess.length > 1 && (
            <div className="mb-6 p-4 rounded-xl border" style={{ borderColor: '#c9e7f7', backgroundColor: '#f4faff' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#001f2a' }}>Import Queue</p>
              <div className="space-y-1">
                {filesToProcess.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    {file.status === 'pending' && (
                      <span className="material-symbols-outlined text-sm" style={{ color: '#43474f' }}>schedule</span>
                    )}
                    {file.status === 'processing' && (
                      <span className="material-symbols-outlined text-sm animate-spin" style={{ color: '#006d43' }}>progress_activity</span>
                    )}
                    {file.status === 'done' && (
                      <span className="material-symbols-outlined text-sm" style={{ color: '#006d43' }}>check_circle</span>
                    )}
                    {file.status === 'error' && (
                      <span className="material-symbols-outlined text-sm" style={{ color: '#991b1b' }}>error</span>
                    )}
                    <span style={{ color: file.status === 'done' ? '#006d43' : file.status === 'error' ? '#991b1b' : '#001f2a' }}>
                      {file.file.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={validRows.length === 0 || !selectedHolderId || loading || parseState === 'done'}
              className="flex-1 py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#001736', color: '#ffffff' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-base">progress_activity</span>
                  Importing {filesToProcess[currentFileIndex]?.file.name}…
                </span>
              ) : (
                `Import ${validRows.length} transaction${validRows.length !== 1 ? 's' : ''} (File ${currentFileIndex + 1}/${filesToProcess.length})`
              )}
            </button>
            <button
              onClick={handleReset}
              className="px-5 py-3 rounded-xl text-sm font-semibold border transition-colors hover:bg-[#e6f6ff]"
              style={{ borderColor: '#c9e7f7', color: '#001736' }}
              disabled={loading}
            >
              {loading ? 'Cancel' : 'Reset'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
