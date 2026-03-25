import { redirect } from 'next/navigation'

export default async function AIPage({
  params,
}: {
  params: Promise<{ familyId: string }>
}) {
  const { familyId } = await params
  redirect(`/families/${familyId}/tax`)
}
