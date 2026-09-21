import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { SCOPED_MANAGER_ROLES } from '@/lib/permissions'
import { getEffectiveAffiliate } from '@/lib/scope'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !SCOPED_MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const report = searchParams.get('report') ?? 'members'
  const from   = searchParams.get('from') ?? new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10)
  const to     = searchParams.get('to')   ?? new Date().toISOString().slice(0, 10)
  const affiliate = getEffectiveAffiliate(session, req)

  const supabase = createAdminClient()

  if (report === 'members') {
    let membersQ = supabase
      .from('members')
      .select('created_at, status')
      .gte('created_at', from)
      .lte('created_at', to + 'T23:59:59')
      .order('created_at')
    if (affiliate) membersQ = membersQ.eq('affiliate', affiliate)
    const { data: members } = await membersQ

    // Group by month
    const byMonth: Record<string, { nuevos: number; activos: number }> = {}
    for (const m of members ?? []) {
      const key = m.created_at.slice(0, 7)
      if (!byMonth[key]) byMonth[key] = { nuevos: 0, activos: 0 }
      byMonth[key].nuevos++
      if (m.status === 'active') byMonth[key].activos++
    }

    let totalActiveQ = supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active')
    if (affiliate) totalActiveQ = totalActiveQ.eq('affiliate', affiliate)
    const { count: totalActive } = await totalActiveQ

    let totalMembersQ = supabase.from('members').select('*', { count: 'exact', head: true })
    if (affiliate) totalMembersQ = totalMembersQ.eq('affiliate', affiliate)
    const { count: totalMembers } = await totalMembersQ

    // Invoice stats for the period
    let invoicesQ = (affiliate
      ? supabase.from('invoices').select('status, created_at, members!member_id!inner(affiliate)')
      : supabase.from('invoices').select('status, created_at')
    ).gte('created_at', from).lte('created_at', to + 'T23:59:59')
    if (affiliate) invoicesQ = invoicesQ.eq('members.affiliate', affiliate)
    const { data: invoicesInPeriod } = await invoicesQ

    const invByMonth: Record<string, { facturas: number; aprobadas: number }> = {}
    let totalInv = 0, approvedInv = 0
    for (const inv of invoicesInPeriod ?? []) {
      const key = inv.created_at.slice(0, 7)
      if (!invByMonth[key]) invByMonth[key] = { facturas: 0, aprobadas: 0 }
      invByMonth[key].facturas++
      totalInv++
      if (inv.status === 'approved') { invByMonth[key].aprobadas++; approvedInv++ }
    }

    return NextResponse.json({
      byMonth: Object.entries(byMonth).map(([month, v]) => ({ month, ...v })),
      totalActive:   totalActive ?? 0,
      totalMembers:  totalMembers ?? 0,
      activationRate: totalMembers ? Math.round(((totalActive ?? 0) / totalMembers) * 100) : 0,
      invoiceStats: {
        total: totalInv,
        approved: approvedInv,
        approvalRate: totalInv ? Math.round((approvedInv / totalInv) * 100) : 0,
        byMonth: Object.entries(invByMonth).map(([month, v]) => ({ month, ...v })),
      },
      newInPeriod: Object.values(byMonth).reduce((s, v) => s + v.nuevos, 0),
    })
  }

  if (report === 'ledger') {
    let entriesQ = (affiliate
      ? supabase.from('ledger_entries').select('type, points, created_at, members!member_id!inner(affiliate)')
      : supabase.from('ledger_entries').select('type, points, created_at')
    ).gte('created_at', from).lte('created_at', to + 'T23:59:59')
    if (affiliate) entriesQ = entriesQ.eq('members.affiliate', affiliate)
    const { data: entries } = await entriesQ

    const byMonth: Record<string, { emitidos: number; canjeados: number }> = {}
    let totalEmitidos  = 0
    let totalCanjeados = 0

    for (const e of entries ?? []) {
      const key = e.created_at.slice(0, 7)
      if (!byMonth[key]) byMonth[key] = { emitidos: 0, canjeados: 0 }
      if (e.points > 0) { byMonth[key].emitidos  += e.points; totalEmitidos  += e.points }
      else               { byMonth[key].canjeados += Math.abs(e.points); totalCanjeados += Math.abs(e.points) }
    }

    // Current circulation (última entrada — aproximación ya existente, sin cambios de fondo)
    let lastEntryQ = (affiliate
      ? supabase.from('ledger_entries').select('balance_after, members!member_id!inner(affiliate)')
      : supabase.from('ledger_entries').select('balance_after')
    ).order('created_at', { ascending: false }).limit(1)
    if (affiliate) lastEntryQ = lastEntryQ.eq('members.affiliate', affiliate)
    const { data: lastEntry } = await lastEntryQ

    return NextResponse.json({
      byMonth:         Object.entries(byMonth).map(([month, v]) => ({ month, ...v })),
      totalEmitidos,
      totalCanjeados,
      enCirculacion:   (lastEntry?.[0]?.balance_after ?? 0),
    })
  }

  if (report === 'rewards') {
    let topQ = (affiliate
      ? supabase.from('redemptions').select(`
          sku_id,
          reward_skus!sku_id ( name, category ),
          reviews!redemption_id ( rating ),
          members!member_id!inner ( affiliate )
        `)
      : supabase.from('redemptions').select(`
          sku_id,
          reward_skus!sku_id ( name, category ),
          reviews!redemption_id ( rating )
        `)
    ).gte('created_at', from).lte('created_at', to + 'T23:59:59')
    if (affiliate) topQ = topQ.eq('members.affiliate', affiliate)
    const { data: top } = await topQ

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
