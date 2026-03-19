export default async function FamilyDashboardPage({
  params,
}: {
  params: Promise<{ familyId: string }>
}) {
  const { familyId } = await params
  // Full implementation in Plan 06 (NAV sync + family dashboard)
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Family Portfolio</h1>
      <p className="text-muted-foreground text-sm">Family ID: {familyId}</p>
      {/* Family dashboard content — Plan 06 */}
    </div>
  )
}
