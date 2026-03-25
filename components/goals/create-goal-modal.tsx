'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface HoldingOption {
  scheme_code: number
  scheme_name: string
}

interface CreateGoalModalProps {
  holderId: string
  holderName: string
  holdings: HoldingOption[]
}

export function CreateGoalModal({ holderId, holderName, holdings }: CreateGoalModalProps) {
  const router = useRouter()
  const closeRef = useRef<HTMLButtonElement>(null)

  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [assumedCagr, setAssumedCagr] = useState('12')
  const [selectedCodes, setSelectedCodes] = useState<Set<number>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  function toggleHolding(code: number) {
    setSelectedCodes(prev => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setApiError(null)

    const amount = parseFloat(targetAmount)
    const cagr = parseFloat(assumedCagr)

    if (isNaN(amount) || amount <= 0) {
      setApiError('Target amount must be a positive number')
      return
    }
    if (isNaN(cagr) || cagr < 0 || cagr > 50) {
      setApiError('Expected CAGR must be between 0 and 50')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holderId,
          name: name.trim(),
          target_amount: amount,
          target_date: targetDate,
          assumed_cagr: cagr,
          scheme_codes: Array.from(selectedCodes),
        }),
      })

      if (!response.ok) {
        const json = await response.json().catch(() => ({ error: 'Request failed' }))
        setApiError((json as { error?: string }).error ?? 'Failed to create goal')
        return
      }

      // Reset form state
      setName('')
      setTargetAmount('')
      setTargetDate('')
      setAssumedCagr('12')
      setSelectedCodes(new Set())
      closeRef.current?.click()
      router.refresh()
    } catch {
      setApiError('Network error — please try again')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate minimum date (tomorrow)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="bg-surface-container-lowest border-2 border-primary text-primary px-6 py-3 rounded-lg flex items-center gap-2 font-bold hover:bg-surface-container transition-all">
          <span className="material-symbols-outlined">add</span>
          Create New Goal
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary font-headline">Create New Goal</DialogTitle>
          <p className="text-sm text-on-surface-variant">
            For <span className="font-bold text-primary">{holderName}</span>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Goal Name */}
          <div>
            <label className="text-sm font-bold text-primary block mb-1">
              Goal Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Retirement Fund, House Downpayment"
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Target Amount */}
          <div>
            <label className="text-sm font-bold text-primary block mb-1">
              Target Amount (₹) <span className="text-error">*</span>
            </label>
            <input
              type="number"
              required
              min={1}
              step={1}
              value={targetAmount}
              onChange={e => setTargetAmount(e.target.value)}
              placeholder="e.g. 5000000"
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Target Date */}
          <div>
            <label className="text-sm font-bold text-primary block mb-1">
              Target Date <span className="text-error">*</span>
            </label>
            <input
              type="date"
              required
              min={minDate}
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Expected CAGR */}
          <div>
            <label className="text-sm font-bold text-primary block mb-1">
              Expected CAGR (%)
            </label>
            <input
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={assumedCagr}
              onChange={e => setAssumedCagr(e.target.value)}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-xs text-on-surface-variant mt-1">
              Assumed annual growth rate for projection (default: 12%)
            </p>
          </div>

          {/* Link Holdings (optional) */}
          {holdings.length > 0 && (
            <div>
              <label className="text-sm font-bold text-primary block mb-2">
                Link Holdings (optional)
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-outline-variant/20 rounded-lg p-3">
                {holdings.map(h => (
                  <label
                    key={h.scheme_code}
                    className="flex items-start gap-3 cursor-pointer hover:bg-surface-container-low rounded-lg px-2 py-1.5 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCodes.has(h.scheme_code)}
                      onChange={() => toggleHolding(h.scheme_code)}
                      className="mt-0.5 accent-primary"
                    />
                    <span className="text-sm text-primary leading-snug">{h.scheme_name}</span>
                  </label>
                ))}
              </div>
              {selectedCodes.size > 0 && (
                <p className="text-xs text-secondary font-bold mt-1.5">
                  {selectedCodes.size} holding{selectedCodes.size !== 1 ? 's' : ''} linked
                </p>
              )}
            </div>
          )}

          {/* API error */}
          {apiError && (
            <p className="text-xs text-error bg-error-container/50 px-3 py-2 rounded-lg">
              {apiError}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <DialogClose asChild>
              <button
                type="button"
                className="flex-1 py-2.5 border border-outline-variant/30 rounded-xl text-sm font-bold hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Goal'}
            </button>
          </div>

          {/* Hidden close target for programmatic close */}
          <DialogClose ref={closeRef} className="hidden" aria-hidden="true" />
        </form>
      </DialogContent>
    </Dialog>
  )
}
