'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface SyncButtonProps {
  onSyncComplete?: () => void
}

export function SyncButton({ onSyncComplete }: SyncButtonProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ synced: number; failed: number; already_current: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSync() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/nav/sync', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Sync failed')
      } else {
        const data = await res.json()
        setResult(data)
        onSyncComplete?.()
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleSync}
        disabled={loading}
        variant="outline"
        size="sm"
      >
        {loading ? 'Syncing NAVs...' : 'Sync NAV'}
      </Button>
      {result && (
        <span className="text-sm text-muted-foreground">
          {result.synced} updated
          {result.failed > 0 && (
            <Badge variant="destructive" className="ml-2">{result.failed} failed</Badge>
          )}
        </span>
      )}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  )
}
