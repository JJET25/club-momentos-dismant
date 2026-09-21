import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { SCOPED_MANAGER_ROLES } from '@/lib/permissions'
import { getEffectiveAffiliate, isAffiliate } from '@/lib/scope'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !SCOPED_MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const affiliate = getEffectiveAffiliate(session, req)
  const supabase = createAdminClient()
  let query = supabase
    .from('partners')
    .select('id, name, logo_url, is_verified, status, affiliate')
    .order('name')
  if (affiliate) query = query.eq('affiliate', affiliate)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: 'Error al obtener aliados' }, { status: 500 })

  return NextResponse.json({ partners: data ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !SCOPED_MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const { name, logo_url, is_verified } = body
  if (!name?.trim()) {
    return NextResponse.json({ error: 'El nombre del aliado es obligatorio' }, { status: 400 })
  }

  const scoped = getEffectiveAffiliate(session, req)
  const affiliate = scoped ?? body.affiliate
  if (!isAffiliate(affiliate)) {
    return NextResponse.json({ error: 'Debes especificar la empresa (dismant o lauti)' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('partners')
    .insert({
      id:          crypto.randomUUID(),
      name:        name.trim(),
      logo_url:    logo_url?.trim() || null,
      is_verified: is_verified ?? false,
      affiliate,
    })
    .select('id, name, logo_url, is_verified, status')
    .single()

  if (error) return NextResponse.json({ error: 'Error al crear aliado' }, { status: 500 })

  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      'partner.created',
    target_type: 'partner',
    target_id:   data.id,
    metadata:    { name: data.name },
  })

  return NextResponse.json({ partner: data }, { status: 201 })
}
