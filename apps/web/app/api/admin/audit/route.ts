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
  const actorId     = searchParams.get('actor_id') ?? ''
  const action      = searchParams.get('action') ?? ''
  const targetType  = searchParams.get('target_type') ?? ''
  const from        = searchParams.get('from') ?? ''
  const to          = searchParams.get('to') ?? ''
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = 50
  const affiliate = getEffectiveAffiliate(session, req)

  const supabase = createAdminClient()

  // Con perspectiva/empresa activa se usa inner join para poder filtrar por
  // affiliate del actor — esto excluye entradas de sistema sin actor_id,
  // que sí se muestran en la vista combinada ("Todas").
  let query = (affiliate
    ? supabase.from('audit_log').select(`
        id, action, target_type, target_id, metadata, created_at,
        members!actor_id!inner ( id, full_name, email, affiliate )
      `, { count: 'exact' })
    : supabase.from('audit_log').select(`
        id, action, target_type, target_id, metadata, created_at,
        members!actor_id ( id, full_name, email )
      `, { count: 'exact' })
  )
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (affiliate)  query = query.eq('members.affiliate', affiliate)
  if (actorId)    query = query.eq('actor_id', actorId)
  if (action)     query = query.ilike('action', `%${action}%`)
  if (targetType) query = query.eq('target_type', targetType)
  if (from)       query = query.gte('created_at', from)
  if (to) {
    const toEnd = new Date(to)
    toEnd.setHours(23, 59, 59, 999)
    query = query.lte('created_at', toEnd.toISOString())
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: 'Error al obtener auditoría' }, { status: 500 })

  return NextResponse.json({
    entries:   data ?? [],
    total:     count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  })
}
