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
  const status = searchParams.get('status') ?? 'pending'

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('invoices')
    .select(`
      id, uuid_cfdi, rfc_emisor, rfc_receptor, total_mxn, issued_at,
      status, points_generated, rejection_reason, approved_at, created_at,
      members!member_id ( id, full_name, company_name, rfc )
    `)
    .eq('status', status)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: 'Error al obtener facturas' }, { status: 500 })
  }

  return NextResponse.json({ invoices: data ?? [] })
}
