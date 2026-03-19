'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

interface FundSearchResult {
  schemeCode: number
  schemeName: string
}

const ManualEntryFormSchema = z.object({
  schemeName: z.string().min(1, 'Fund name is required'),
  schemeCode: z.number({ required_error: 'Select a fund from the search results' }),
  fundHouse: z.string(),
  units: z.coerce.number().positive('Units must be positive'),
  purchaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
    .refine((d) => new Date(d) <= new Date(), 'Purchase date cannot be in the future'),
  costNav: z.coerce.number().positive('Cost NAV must be positive'),
})

type ManualEntryFormValues = z.infer<typeof ManualEntryFormSchema>

interface ManualEntryFormProps {
  holderId: string
  onEntryComplete: () => void
}

export function ManualEntryForm({ holderId, onEntryComplete }: ManualEntryFormProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FundSearchResult[]>([])
  const [selectedFund, setSelectedFund] = useState<FundSearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<ManualEntryFormValues>({
    resolver: zodResolver(ManualEntryFormSchema),
    defaultValues: {
      schemeName: '',
      fundHouse: '',
      purchaseDate: '',
    },
  })

  const searchFunds = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const res = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error('Search failed')
      const data = (await res.json()) as FundSearchResult[]
      setSearchResults(data.slice(0, 10)) // limit to 10 results
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleFundSelect = (fund: FundSearchResult) => {
    setSelectedFund(fund)
    form.setValue('schemeCode', fund.schemeCode)
    form.setValue('schemeName', fund.schemeName)
    setSearchResults([])
    setSearchQuery(fund.schemeName)
  }

  const onSubmit = async (values: ManualEntryFormValues) => {
    setSubmitError(null)
    try {
      const res = await fetch('/api/manual-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, holderId }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error: string }
        setSubmitError(data.error ?? 'Failed to add holding')
        return
      }
      form.reset()
      setSelectedFund(null)
      setSearchQuery('')
      setOpen(false)
      onEntryComplete()
    } catch {
      setSubmitError('Network error. Please try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Add Holding Manually</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Holding Manually</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Fund search */}
            <div className="space-y-1">
              <FormLabel>Fund Name</FormLabel>
              <div className="relative">
                <Input
                  placeholder="Search for a fund..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setSelectedFund(null)
                    searchFunds(e.target.value)
                  }}
                />
                {isSearching && (
                  <p className="text-xs text-muted-foreground mt-1">Searching...</p>
                )}
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-md max-h-48 overflow-y-auto">
                    {searchResults.map((fund) => (
                      <button
                        key={fund.schemeCode}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                        onClick={() => handleFundSelect(fund)}
                      >
                        {fund.schemeName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {form.formState.errors.schemeCode && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.schemeCode.message}
                </p>
              )}
            </div>

            {/* Show remaining fields only after fund selection */}
            {selectedFund && (
              <>
                <FormField
                  control={form.control}
                  name="units"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Units Purchased</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="100.0000"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="costNav"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NAV at Purchase (Rs.)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="45.2300"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!selectedFund || form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? 'Adding...' : 'Add Holding'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
