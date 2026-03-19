import { Badge } from '@/components/ui/badge'
import { format, parseISO, differenceInDays } from 'date-fns'

export function NavBadge({ navDate }: { navDate: string | null }) {
  if (!navDate) return <Badge variant="secondary">No NAV synced</Badge>
  const days = differenceInDays(new Date(), parseISO(navDate))
  const label = `NAV as of ${format(parseISO(navDate), 'dd MMM yyyy')}`
  const variant = days > 3 ? 'destructive' : 'secondary'
  return <Badge variant={variant}>{label}</Badge>
}
