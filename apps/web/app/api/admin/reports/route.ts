import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { MANAGER_ROLES } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const report = searchParams.get('report') ?? 'members'
  const from   = searchParams.get('from') ?? new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10)
  const to     = searchParams.get('to')   ?? new Date().toISOString().slice(0, 10)

  const supabase = createAdminClient()

  if (report === 'members') {
    const { data: members } = await supabase
      .from('members')
      .select('created_at, status')
      .gte('created_at', from)
      .lte('created_at', to + 'T23:59:59')
      .order('created_at')

    // Group by month
    const byMonth: Record<string, { nuevos: number; activos: number }> = {}
    for (const m of members ?? []) {
      const key = m.created_at.slice(0, 7)
      if (!byMonth[key]) byMonth[key] = { nuevos: 0, activos: 0 }
      byMonth[key].nuevos++
      if (m.status === 'active') byMonth[key].activos++
    }

    const { count: totalActive } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const { count: totalMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      byMonth: Object.entries(byMonth).map(([month, v]) => ({ month, ...v })),
      totalActive:   totalActive ?? 0,
      totalMembers:  totalMembers ?? 0,
      activationRate: totalMembers ? Math.round(((totalActive ?? 0) / totalMembers) * 100) : 0,
    })
  }

  if (report === 'ledger') {
    const { data: entries } = await supabase
      .from('ledger_entries')
      .select('type, points, created_at')
      .gte('created_at', from)
      .lte('created_at', to + 'T23:59:59')

    const byMonth: Record<string, { emitidos: number; canjeados: number }> = {}
    let totalEmitidos  = 0
    let totalCanjeados = 0

    for (const e of entries ?? []) {
      const key = e.created_at.slice(0, 7)
      if (!byMonth[key]) byMonth[key] = { emitidos: 0, canjeados: 0 }
      if (e.points > 0) { byMonth[key].emitidos  += e.points; totalEmitidos  += e.points }
      else               { byMonth[key].canjeados += Math.abs(e.points); totalCanjeados += Math.abs(e.points) }
    }

    // Current circulation
    const { data: lastEntry } = await supabase
      .from('ledger_entries')
      .select('balance_after')
      .order('created_at', { ascending: false })
      .limit(1)

    return NextResponse.json({
      byMonth:         Object.entries(byMonth).map(([month, v]) => ({ month, ...v })),
      totalEmitidos,
      totalCanjeados,
      enCirculacion:   (lastEntry?.[0]?.balance_after ?? 0),
    })
  }

  if (report === 'rewards') {
    const { data: top } = await supabase
      .from('redemptions')
      .select(`
        sku_id,
        reward_skus!sku_id ( name, category ),
        reviews!redemption_id ( rating )
      `)
      .gte('created_at', from)
      .lte('created_at', to + 'T23:59:59')

    type SkuStats = { name: string; category: string | null; count: number; ratings: number[]; reviewCount: number }
    const bysku: Record<string, SkuStats> = {}

    for (const r of top ?? []) {
      const sku = r.reward_skus as unknown as { name: string; category: string | null } | null
      if (!sku) continue
      if (!bysku[r.sku_id]) bysku[r.sku_id] = { name: sku.name, category: sku.category, count: 0, ratings: [], reviewCount: 0 }
      bysku[r.sku_id].count++
      const reviews = r.reviews as unknown as { rating: number }[] | null
      if (reviews && reviews.length > 0) {
        bysku[r.sku_id].ratings.push(reviews[0].rating)
        bysku[r.sku_id].reviewCount++
      }
    }

    const sorted = Object.values(bysku)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(s => ({
        name:        s.name,
        category:    s.category,
        count:       s.count,
        avgRating:   s.ratings.length ? Math.round(s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length * 10) / 10 : null,
        reviewRate:  s.count > 0 ? Math.round((s.reviewCount / s.count) * 100) : 0,
      }))

    return NextResponse.json({ top: sorted })
  }

  return NextResponse.json({ error: 'Reporte no reconocido' }, { status: 400 })
}
