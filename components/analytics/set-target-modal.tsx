'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AllocationTargetSchema } from '@/lib/analytics/asset-class-mapper'

type AllocationTargetFormValues = z.infer<typeof AllocationTargetSchema>

interface SetTargetModalProps {
  holderId: string
  currentTargets: AllocationTargetFormValues
}

export function SetTargetModal({ holderId, currentTargets }: SetTargetModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AllocationTargetFormValues>({
    resolver: zodResolver(AllocationTargetSchema),
    defaultValues: currentTargets,
  })

  const watchedValues = watch()
  const total =
    (Number(watchedValues.equity) || 0) +
    (Number(watchedValues.debt) || 0) +
    (Number(watchedValues.gold) || 0) +
    (Number(watchedValues.international) || 0)
  const unallocated = Math.max(0, 100 - total)

  async function onSubmit(data: AllocationTargetFormValues) {
    setApiError(null)
    try {
      const response = await fetch('/api/allocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holderId, ...data }),
      })
      if (!response.ok) {
        const json = await response.json().catch(() => ({ error: 'Request failed' }))
        setApiError((json as { error?: string }).error ?? 'Failed to save allocation targets')
        return
      }
      setOpen(false)
      router.refresh()
    } catch {
      setApiError('Network error — please try again')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-xs font-bold text-primary border border-outline-variant/30 px-3 py-1.5 rounded-xl hover:bg-surface-container transition-colors">
          Set Target
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary font-headline">Set Allocation Targets</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <p className="text-sm text-on-surface-variant">
            Define your target allocation across asset classes. Total must not exceed 100%.
          </p>

          {/* Equity */}
          <div>
            <label className="text-sm font-bold text-primary block mb-1">
              Equity %
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              {...register('equity', { valueAsNumber: true })}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. 60"
            />
            {errors.equity && (
              <p className="text-xs text-error mt-1">{errors.equity.message}</p>
            )}
          </div>

          {/* Debt */}
          <div>
            <label className="text-sm font-bold text-primary block mb-1">
              Debt %
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              {...register('debt', { valueAsNumber: true })}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. 30"
            />
            {errors.debt && (
              <p className="text-xs text-error mt-1">{errors.debt.message}</p>
            )}
          </div>

          {/* Gold */}
          <div>
            <label className="text-sm font-bold text-primary block mb-1">
              Gold %
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              {...register('gold', { valueAsNumber: true })}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. 5"
            />
            {errors.gold && (
              <p className="text-xs text-error mt-1">{errors.gold.message}</p>
            )}
          </div>

          {/* International */}
          <div>
            <label className="text-sm font-bold text-primary block mb-1">
              International %
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              {...register('international', { valueAsNumber: true })}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. 5"
            />
            {errors.international && (
              <p className="text-xs text-error mt-1">{errors.international.message}</p>
            )}
          </div>

          {/* Real-time sum display */}
          <div className={`text-sm font-bold px-3 py-2 rounded-lg ${total > 100 ? 'bg-error-container text-on-error-container' : 'bg-surface-container-low text-on-surface'}`}>
            Total: {total.toFixed(1)}%
            {total <= 100 && (
              <span className="font-normal text-on-surface-variant ml-2">
                ({unallocated.toFixed(1)}% unallocated)
              </span>
            )}
            {total > 100 && (
              <span className="ml-2">— exceeds 100%</span>
            )}
          </div>

          {/* Cross-field validation error (from zod refine) */}
          {errors.root && (
            <p className="text-xs text-error">{errors.root.message}</p>
          )}

          {/* API error */}
          {apiError && (
            <p className="text-xs text-error bg-error-container/50 px-3 py-2 rounded-lg">{apiError}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 py-2.5 border border-outline-variant/30 rounded-xl text-sm font-bold hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || total > 100}
              className="flex-1 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Targets'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
