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
  const actorId  = searchParams.get('actor_id') ?? ''
  const action   = searchParams.get('action') ?? ''
  const from     = searchParams.get('from') ?? ''
  const to       = searchParams.get('to') ?? ''
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = 50

  const supabase = createAdminClient()

  let query = supabase
    .from('audit_log')
    .select(`
      id, action, target_type, target_id, metadata, created_at,
      members!actor_id ( id, full_name, email )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (actorId)             query = query.eq('actor_id', actorId)
  if (action)              query = query.ilike('action', `%${action}%`)
  if (from)                query = query.gte('created_at', from)
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
