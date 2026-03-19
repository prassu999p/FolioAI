export default async function HolderHoldingsPage({
  params,
}: {
  params: Promise<{ familyId: string; holderId: string }>
}) {
  const { holderId } = await params
  // Full holdings list — implemented in Plan 05
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Holdings</h1>
      <p className="text-muted-foreground text-sm">Holder ID: {holderId}</p>
      {/* Holdings list — Plan 05 */}
    </div>
  )
}
