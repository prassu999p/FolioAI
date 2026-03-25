'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface ImportResult {
  imported: number
  needs_review: number
  errors: string[]
}

export default function CASImportForm({ familyId }: { familyId: string }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    if (password) formData.append('password', password)

    try {
      const res = await fetch('/api/cas/import', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Import failed')
      } else {
        setResult(data)
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  function handleDone() {
    router.push(`/families/${familyId}`)
  }

  return (
    <div className="px-8 py-8 max-w-2xl mx-auto">
      {/* Instructions */}
      <div
        className="rounded-2xl p-6 mb-8"
        style={{ backgroundColor: '#e6f6ff' }}
      >
        <div className="flex gap-3 items-start">
          <span className="material-symbols-outlined mt-0.5" style={{ color: '#006d43' }}>info</span>
          <div>
            <p className="font-semibold text-sm mb-1" style={{ color: '#001f2a' }}>
              How to get your CAS
            </p>
            <p className="text-sm" style={{ color: '#43474f' }}>
              Request a Consolidated Account Statement (CAS) from{' '}
              <span className="font-medium">CAMS</span> or <span className="font-medium">KFintech</span>.
              The PDF may be password-protected — enter your PAN in lowercase if prompted.
            </p>
          </div>
        </div>
      </div>

      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File upload */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#001f2a' }}>
              CAS PDF
            </label>
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-[#006d43]"
              style={{ borderColor: file ? '#006d43' : '#43474f' }}
              onClick={() => fileRef.current?.click()}
            >
              <span className="material-symbols-outlined text-4xl mb-2 block" style={{ color: file ? '#006d43' : '#43474f' }}>
                {file ? 'check_circle' : 'upload_file'}
              </span>
              <p className="text-sm font-medium" style={{ color: '#001f2a' }}>
                {file ? file.name : 'Click to select PDF'}
              </p>
              {!file && (
                <p className="text-xs mt-1" style={{ color: '#43474f' }}>
                  PDF files only
                </p>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#001f2a' }}>
              PDF Password <span className="font-normal text-xs" style={{ color: '#43474f' }}>(optional — usually PAN in lowercase)</span>
            </label>
            <input
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="e.g. abcde1234f"
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2"
              style={{
                borderColor: '#c9e7f7',
                backgroundColor: '#ffffff',
                color: '#001f2a',
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm flex gap-2 items-center"
              style={{ backgroundColor: '#fef2f2', color: '#991b1b' }}
            >
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!file || loading}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#001736', color: '#ffffff' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                Importing…
              </span>
            ) : (
              'Import CAS'
            )}
          </button>
        </form>
      ) : (
        /* Results */
        <div className="space-y-4">
          <div
            className="rounded-2xl p-6"
            style={{ backgroundColor: result.errors.length === 0 ? '#f0fdf4' : '#fefce8' }}
          >
            <div className="flex gap-3 items-center mb-4">
              <span
                className="material-symbols-outlined"
                style={{ color: result.errors.length === 0 ? '#15803d' : '#a16207' }}
              >
                {result.errors.length === 0 ? 'check_circle' : 'warning'}
              </span>
              <p className="font-semibold" style={{ color: '#001f2a' }}>
                Import complete
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold tabular-nums" style={{ color: '#006d43' }}>
                  {result.imported}
                </p>
                <p className="text-xs mt-1" style={{ color: '#43474f' }}>Imported</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums" style={{ color: '#a16207' }}>
                  {result.needs_review}
                </p>
                <p className="text-xs mt-1" style={{ color: '#43474f' }}>Needs review</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums" style={{ color: '#991b1b' }}>
                  {result.errors.length}
                </p>
                <p className="text-xs mt-1" style={{ color: '#43474f' }}>Errors</p>
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-xl border p-4 space-y-1" style={{ borderColor: '#fecaca' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#991b1b' }}>Errors</p>
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs" style={{ color: '#43474f' }}>{e}</p>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setResult(null); setFile(null); setPassword('') }}
              className="flex-1 py-3 rounded-xl font-semibold text-sm border transition-colors hover:bg-[#e6f6ff]"
              style={{ borderColor: '#c9e7f7', color: '#001736' }}
            >
              Import another
            </button>
            <button
              onClick={handleDone}
              className="flex-1 py-3 rounded-xl font-semibold text-sm transition-opacity"
              style={{ backgroundColor: '#001736', color: '#ffffff' }}
            >
              Go to dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
