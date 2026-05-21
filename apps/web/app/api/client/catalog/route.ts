import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') ?? ''
  const sort     = searchParams.get('sort') ?? 'cost_asc'

  const supabase = createAdminClient()

  // Obtener saldo y ubicación del miembro en paralelo
  const [ledgerRes, memberRes] = await Promise.all([
    supabase
      .from('ledger_entries')
      .select('balance_after')
      .eq('member_id', session.sub)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('members')
      .select('location_state, location_city')
      .eq('id', session.sub)
      .single(),
  ])

  const balance       = ledgerRes.data?.balance_after ?? 0
  const memberState   = memberRes.data?.location_state ?? ''
  const memberCity    = memberRes.data?.location_city  ?? ''

  // Traer todos los premios activos
  const { data: skus, error } = await supabase
    .from('reward_skus')
    .select('id, name, description, image_url, points_cost, stock, geo_type, geo_states, geo_cities, is_digital, category')
    .eq('status', 'active')

  if (error) {
    return NextResponse.json({ error: 'Error al cargar el catálogo' }, { status: 500 })
  }

  // Filtrar por geo
  const filtered = (skus ?? []).filter(sku => {
    if (sku.geo_type === 'national') return true
    const stateMatch = memberState && (sku.geo_states as string[]).includes(memberState)
    const cityMatch  = memberCity  && (sku.geo_cities as string[]).includes(memberCity)
    return stateMatch || cityMatch
  })

  // Filtrar por categoría
  const byCategory = category
    ? filtered.filter(s => s.category === category)
    : filtered

  // Ordenar
  const sorted = [...byCategory].sort((a, b) => {
    if (sort === 'cost_asc')  return a.points_cost - b.points_cost
    if (sort === 'cost_desc') return b.points_cost - a.points_cost
    return a.points_cost - b.points_cost
  })

  // Categorías únicas disponibles
  const categories = [...new Set((skus ?? []).map(s => s.category).filter(Boolean))] as string[]

  return NextResponse.json({ balance, skus: sorted, categories })
}
