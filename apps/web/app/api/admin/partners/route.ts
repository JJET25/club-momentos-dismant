import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { MANAGER_ROLES } from '@/lib/permissions'

export async function GET() {
  const session = await getSession()
  if (!session || !MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('partners')
    .select('id, name, logo_url, is_verified')
    .order('name')

  if (error) return NextResponse.json({ error: 'Error al obtener aliados' }, { status: 500 })

  return NextResponse.json({ partners: data ?? [] })
}
