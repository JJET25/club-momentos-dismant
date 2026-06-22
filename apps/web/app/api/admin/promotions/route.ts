import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { MANAGER_ROLES } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const status  = searchParams.get('status')
  const search  = searchParams.get('q')

  let query = supabase
    .from('partner_promotions')
    .select(`
      id, title, description, image_url, banner_key, destination_url,
      geo_type, geo_states, geo_cities, valid_from, valid_until,
      status, featured, created_at,
      partners!partner_id ( id, name, logo_url, is_verified )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (status && status !== 'all') query = query.eq('status', status)
  if (search) query = query.ilike('title', `%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Error al obtener promociones' }, { status: 500 })

  return NextResponse.json({ promotions: data ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const {
    partner_id, title, description, image_url, destination_url,
    geo_type, geo_states, geo_cities, valid_from, valid_until, featured,
  } = body

  if (!partner_id || !title?.trim() || !valid_from || !valid_until) {
    return NextResponse.json({ error: 'Faltan campos requeridos: partner_id, title, valid_from, valid_until' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('partner_promotions')
    .insert({
      id:              crypto.randomUUID(),
      partner_id,
      title:           title.trim(),
      description:     description?.trim() || null,
      image_url:       image_url || null,
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
