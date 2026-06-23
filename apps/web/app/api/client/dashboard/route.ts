import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { getSignedDownloadUrl } from '@/lib/storage'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const memberId = session.sub
  const now = new Date()
  const nowIso = now.toISOString()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

  // Todas las queries en paralelo
  const [
    movementsRes, monthRes, redeemedRes, invoicesRes, expiringRes,
    memberRes, pastRedemptionsRes, promosRes, skusRes,
  ] = await Promise.all([
    supabase.from('ledger_entries')
      .select('id, type, points, balance_after, description, created_at, expires_at')
      .eq('member_id', memberId).order('created_at', { ascending: false }).limit(5),

    supabase.from('ledger_entries')
      .select('points').eq('member_id', memberId)
      .gte('created_at', startOfMonth).gt('points', 0),

    supabase.from('ledger_entries')
      .select('points').eq('member_id', memberId).eq('type', 'redemption'),

    supabase.from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', memberId).eq('status', 'approved'),

    supabase.from('ledger_entries')
      .select('points, expires_at').eq('member_id', memberId)
      .gt('points', 0).gte('expires_at', nowIso).lte('expires_at', in30Days),

    supabase.from('members')
      .select('location_state, location_city, full_name').eq('id', memberId).single(),

    supabase.from('redemptions')
      .select('reward_skus!sku_id(category)').eq('member_id', memberId).limit(20),

    supabase.from('partner_promotions')
      .select('id, title, description, image_url, banner_key, valid_until, featured, geo_type, geo_states, geo_cities, partners!partner_id(name, logo_url, is_verified)')
      .eq('status', 'active').lte('valid_from', nowIso).gte('valid_until', nowIso)
      .order('featured', { ascending: false }).order('created_at', { ascending: false }).limit(10),

    supabase.from('reward_skus')
      .select('id, name, image_url, points_cost, category, is_digital, geo_type, geo_states, geo_cities, stock')
      .eq('status', 'active').order('points_cost', { ascending: true }),
  ])

  const recentMovements = movementsRes.data ?? []
  const currentBalance  = recentMovements[0]?.balance_after ?? 0

  const pointsThisMonth = (monthRes.data ?? []).reduce((s, e) => s + e.points, 0)
  const pointsRedeemed  = (redeemedRes.data ?? []).reduce((s, e) => s + Math.abs(e.points), 0)
  const invoicesApproved = invoicesRes.count ?? 0

  const expiringPoints = (expiringRes.data ?? []).reduce((s, e) => s + e.points, 0)
  const expiringDate   = expiringRes.data?.[0]?.expires_at ?? null

  const memberState = memberRes.data?.location_state ?? ''
  const memberCity  = memberRes.data?.location_city  ?? ''
  const memberName  = memberRes.data?.full_name ?? ''

  // Categorías del historial de canjes del usuario
  const redeemedCategories = [
    ...new Set(
      (pastRedemptionsRes.data ?? [])
        .map(r => (r.reward_skus as unknown as { category: string | null } | null)?.category)
        .filter(Boolean) as string[]
    ),
  ]

  // ── Promociones para ti ───────────────────────────────────
  const allPromos = promosRes.data ?? []
  const geoPromos = allPromos.filter(p => {
    if (p.geo_type === 'national') return true
    return (p.geo_states as string[] ?? []).includes(memberState) ||
           (p.geo_cities as string[] ?? []).includes(memberCity)
  }).slice(0, 3)

  // Generar banner_url firmada para cada promo con banner_key
  const featuredPromos = await Promise.all(
    geoPromos.map(async p => {
      let bannerUrl: string | null = p.image_url ?? null
      if (p.banner_key) {
        bannerUrl = await getSignedDownloadUrl(p.banner_key as string, 3600).catch(() => p.image_url ?? null)
      }
      return { ...p, bannerUrl }
    })
  )

  // ── Premios sugeridos ─────────────────────────────────────
  const allSkus = skusRes.data ?? []

  // Filtrar por geo y disponibilidad
  const geoSkus = allSkus.filter(s => {
    if (s.geo_type === 'national') return true
    return (s.geo_states as string[] ?? []).includes(memberState) ||
           (s.geo_cities as string[] ?? []).includes(memberCity)
  }).filter(s => s.stock === null || s.stock > 0)

  // Separar: los que puede canjear ya vs. los que están cerca (hasta 60% más de su saldo)
  const canAfford    = geoSkus.filter(s => s.points_cost <= currentBalance)
  const almostAfford = geoSkus.filter(s =>
    s.points_cost > currentBalance && s.points_cost <= Math.max(currentBalance * 1.6, currentBalance + 300)
  )

  // Priorizar categorías del historial
  const fromHistory = canAfford.filter(s => redeemedCategories.includes(s.category ?? ''))
  const otherAfford = canAfford.filter(s => !redeemedCategories.includes(s.category ?? ''))

  const suggestedSkus = [...fromHistory, ...otherAfford, ...almostAfford].slice(0, 4)

  // Próximo canje: lo más valioso que puede canjear ya, o lo más barato si no puede nada
  const bestAffordable = [...canAfford].sort((a, b) => b.points_cost - a.points_cost)[0] ?? null
  const cheapestAny    = [...geoSkus].sort((a, b) => a.points_cost - b.points_cost)[0] ?? null
  const nextRewardRaw  = bestAffordable ?? cheapestAny
  const nextReward = nextRewardRaw ? {
    name:       nextRewardRaw.name,
    pointsCost: nextRewardRaw.points_cost,
    canAfford:  nextRewardRaw.points_cost <= currentBalance,
    ptsNeeded:  Math.max(0, nextRewardRaw.points_cost - currentBalance),
  } : null

  return NextResponse.json({
    currentBalance,
    pointsThisMonth,
    pointsRedeemed,
    invoicesApproved,
    recentMovements,
    expiring: expiringPoints > 0 ? { points: expiringPoints, date: expiringDate } : null,
    memberName,
    nextReward,
    featuredPromos,
    suggestedSkus: suggestedSkus.map(s => ({ ...s, canAfford: s.points_cost <= currentBalance })),
  })
}
