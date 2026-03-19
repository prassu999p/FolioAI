'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

interface AddHolderFormProps {
  familyId: string
}

export function AddHolderForm({ familyId: _familyId }: AddHolderFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [pan, setPan] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/holders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pan: pan.toUpperCase(), is_primary: false }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      if (typeof data.error === 'string') {
        setError(data.error)
      } else if (data.error?.fieldErrors) {
        const msgs = Object.values(data.error.fieldErrors as Record<string, string[]>).flat()
        setError(msgs.join(', ') || 'Validation failed')
      } else {
        setError('Failed to add holder')
      }
      return
    }

    setOpen(false)
    setName('')
    setPan('')
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Holder</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Family Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="holder-name">Full Name</Label>
            <Input
              id="holder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              required
            />
          </div>
          <div>
            <Label htmlFor="holder-pan">PAN</Label>
            <Input
              id="holder-pan"
              value={pan}
              onChange={(e) => setPan(e.target.value.toUpperCase())}
              placeholder="ABCDE1234F"
              maxLength={10}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add Holder'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
