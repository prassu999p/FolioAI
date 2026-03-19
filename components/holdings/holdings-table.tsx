'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { NavBadge } from './nav-badge'
import type { HoldingRow } from '@/lib/supabase/types'

const formatINR = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

interface HoldingsTableProps {
  holdings: HoldingRow[]
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  const totalCurrentValue = holdings.reduce(
    (sum, h) => sum + (h.current_value ?? 0),
    0
  )

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fund Name</TableHead>
          <TableHead>Fund House</TableHead>
          <TableHead className="text-right">Units</TableHead>
          <TableHead className="text-right">Avg Cost NAV</TableHead>
          <TableHead className="text-right">Current Value</TableHead>
          <TableHead>NAV Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {holdings.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              No holdings yet. Import a CAS file or add a holding manually.
            </TableCell>
          </TableRow>
        ) : (
          holdings.map((holding) => (
            <TableRow key={`${holding.folio_id}-${holding.scheme_code}`}>
              <TableCell className="font-medium">{holding.scheme_name}</TableCell>
              <TableCell className="text-muted-foreground">{holding.fund_house}</TableCell>
              <TableCell className="text-right font-mono">
                {holding.units.toFixed(4)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatINR(holding.avg_cost_nav)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {holding.current_value !== null
                  ? formatINR(holding.current_value)
                  : '—'}
              </TableCell>
              <TableCell>
                <NavBadge navDate={holding.current_nav_date} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
      {holdings.length > 0 && (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4} className="font-semibold">Total Portfolio Value</TableCell>
            <TableCell className="text-right font-semibold font-mono">
              {formatINR(totalCurrentValue)}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      )}
    </Table>
  )
}
