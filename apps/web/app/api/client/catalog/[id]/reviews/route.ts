import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id: skuId } = await params
  const supabase = createAdminClient()

  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, members!member_id(location_city)')
    .eq('sku_id', skuId)
    .order('created_at', { ascending: false })
    .limit(20)

  const total  = reviews?.length ?? 0
  const avg    = total > 0
    ? Math.round((reviews!.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10
    : null

  return NextResponse.json({
    reviews:   (reviews ?? []).slice(0, 5).map(r => ({
      id:      r.id,
      rating:  r.rating,
      comment: r.comment,
      city:    (r.members as unknown as { location_city: string } | null)?.location_city ?? null,
      date:    r.created_at,
    })),
    totalCount: total,
    avgRating:  avg,
  })
}
