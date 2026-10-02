import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { SCOPED_MANAGER_ROLES } from '@/lib/permissions'
import { getEffectiveAffiliate } from '@/lib/scope'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !SCOPED_MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const status  = searchParams.get('status')
  const search  = searchParams.get('q')
  const affiliate = getEffectiveAffiliate(session, req)

  // partner_promotions.affiliate = empresa del aliado (se fija al crear)
  let query = supabase.from('partner_promotions').select(`
      id, title, description, image_url, banner_key, destination_url,
      geo_type, geo_states, geo_cities, valid_from, valid_until,
      status, featured, created_at, sku_id, affiliate,
      partners!partner_id ( id, name, logo_url, is_verified ),
      reward_skus!sku_id ( id, name, image_url, points_cost )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (affiliate) query = query.eq('affiliate', affiliate)
  if (status && status !== 'all') query = query.eq('status', status)
  if (search) query = query.ilike('title', `%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Error al obtener promociones' }, { status: 500 })

  return NextResponse.json({ promotions: data ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !SCOPED_MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const {
    partner_id, sku_id, title, description, image_url, destination_url,
    geo_type, geo_states, geo_cities, valid_from, valid_until, featured,
  } = body

  if (!partner_id || !valid_from || !valid_until) {
    return NextResponse.json({ error: 'Faltan campos requeridos: partner_id, valid_from, valid_until' }, { status: 400 })
  }
  if (!sku_id && !title?.trim()) {
    return NextResponse.json({ error: 'Se requiere un título, o un premio del catálogo (sku_id) del que tomarlo' }, { status: 400 })
  }

  const affiliate = getEffectiveAffiliate(session, req)
  const supabase = createAdminClient()

  // La promoción pertenece a la empresa de su aliado. Con una empresa activa
  // (rol scoped o perspectiva elegida) solo se aceptan aliados de esa empresa.
  const { data: partner } = await supabase.from('partners').select('affiliate').eq('id', partner_id).maybeSingle()
  if (!partner || (affiliate && partner.affiliate !== affiliate)) {
    return NextResponse.json({ error: 'Aliado no encontrado' }, { status: 404 })
  }

  // Si se liga a un premio del catálogo, se jalan título/imagen/descripción de
  // ahí como default — el admin puede seguir sobreescribiéndolos a mano.
  let sku: { name: string; description: string | null; image_url: string | null } | null = null
  if (sku_id) {
    const { data } = await supabase
      .from('reward_skus')
      .select('name, description, image_url')
      .eq('id', sku_id)
      .eq('affiliate', partner.affiliate) // el premio debe ser del catálogo de la misma empresa
      .maybeSingle()
    if (!data) return NextResponse.json({ error: 'Premio de catálogo no encontrado' }, { status: 404 })
    sku = data
  }

  const { data, error } = await supabase
    .from('partner_promotions')
    .insert({
      id:              crypto.randomUUID(),
      partner_id,
      affiliate:       partner.affiliate,
      sku_id:          sku_id || null,
      title:           (title?.trim() || sku?.name) as string,
      description:     description?.trim() || sku?.description || null,
      image_url:       image_url || sku?.image_url || null,
      destination_url: destination_url?.trim() || null,
      geo_type:        geo_type ?? 'national',
      geo_states:      geo_states ?? [],
      geo_cities:      geo_cities ?? [],
      valid_from,
      valid_until,
      featured:        featured ?? false,
      status:          'draft',
      created_by:      session.sub,
    })
    .select('id, title, status')
    .single()

  if (error) return NextResponse.json({ error: 'Error al crear promoción' }, { status: 500 })

  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      'promotion.created',
    target_type: 'partner_promotion',
    target_id:   data.id,
    metadata:    { title, partner_id },
  })

  return NextResponse.json({ promotion: data }, { status: 201 })
}
