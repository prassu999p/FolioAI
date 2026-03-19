'use client'
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface CASUploadFormProps {
  onImportComplete?: () => void
}

export function CASUploadForm({ onImportComplete }: CASUploadFormProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    imported: number
    needs_review: number
    errors: string[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('password', password)

    try {
      const res = await fetch('/api/cas/import', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Import failed')
      } else {
        setResult(data)
        onImportComplete?.()
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Import CAS PDF</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import CAMS / KFintech CAS PDF</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="cas-file">CAS PDF File</Label>
            <Input
              id="cas-file"
              type="file"
              accept=".pdf"
              ref={fileInputRef}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              onClick={(e) => { (e.target as HTMLInputElement).value = '' }}
              required
            />
          </div>
          <div>
            <Label htmlFor="cas-password">
              Password (PAN + DOB, e.g. ABCDE1234F01011990)
            </Label>
            <Input
              id="cas-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank if not password protected"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {result && (
            <div className="space-y-1">
              <Badge variant="default">{result.imported} transactions imported</Badge>
              {result.needs_review > 0 && (
                <>
                  <Badge variant="secondary">{result.needs_review} rows need review</Badge>
                  <p className="text-xs text-muted-foreground">
                    Flagged rows appear in your holdings list for manual correction.
                  </p>
                </>
              )}
            </div>
          )}
          <Button type="submit" disabled={loading || !file}>
            {loading ? 'Importing...' : 'Import'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
