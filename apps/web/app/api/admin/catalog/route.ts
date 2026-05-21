import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

const ADMIN_ROLES = ['owner', 'admin', 'employee']

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'all'
  const q      = searchParams.get('q')?.trim() ?? ''

  const supabase = createAdminClient()

  let query = supabase
    .from('reward_skus')
    .select('id, name, description, image_url, points_cost, stock, stock_alert_threshold, geo_type, geo_states, geo_cities, is_digital, status, category, created_at')
    .order('created_at', { ascending: false })

  if (status !== 'all') query = query.eq('status', status)
  if (q) query = query.ilike('name', `%${q}%`)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: 'Error al obtener catálogo' }, { status: 500 })
  return NextResponse.json({ skus: data ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !['owner', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const { name, description, points_cost, stock, category, is_digital, geo_type, geo_states, geo_cities, image_url } = body

  if (!name?.trim())                         return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  if (!Number.isInteger(points_cost) || points_cost <= 0) return NextResponse.json({ error: 'El costo en puntos debe ser un entero positivo' }, { status: 400 })
  if (!Number.isInteger(stock) || stock < 0) return NextResponse.json({ error: 'El stock debe ser un entero no negativo' }, { status: 400 })
  if (geo_type === 'local' && (!Array.isArray(geo_states) || geo_states.length === 0)) {
    return NextResponse.json({ error: 'Debes especificar al menos un estado para cobertura local' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('reward_skus')
    .insert({
      name:                  name.trim(),
      description:           description?.trim() || null,
      image_url:             image_url?.trim() || null,
      points_cost,
      stock,
      stock_alert_threshold: body.stock_alert_threshold ?? 10,
      geo_type:              geo_type ?? 'national',
      geo_states:            geo_states ?? [],
      geo_cities:            geo_cities ?? [],
      is_digital:            is_digital ?? false,
      category:              category?.trim() || null,
      status:                'active',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Error al crear premio' }, { status: 500 })

  await supabase.from('audit_log').insert({
    actor_id:    session.sub,
    action:      'catalog.sku_created',
    target_type: 'reward_sku',
    target_id:   data.id,
    metadata:    { name: data.name, points_cost, stock },
  })

  return NextResponse.json({ sku: data }, { status: 201 })
}
