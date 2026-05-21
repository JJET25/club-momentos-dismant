import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? ''
  const from = searchParams.get('from') ?? ''
  const to   = searchParams.get('to')   ?? ''

  const supabase = createAdminClient()

  let query = supabase
    .from('ledger_entries')
    .select(`
      id, type, points, balance_after, description, created_at, expires_at,
      invoices!invoice_id (
        uuid_cfdi, total_mxn, issued_at, rfc_emisor, status, approved_at,
        approved_by
      )
    `)
    .eq('member_id', session.sub)
    .order('created_at', { ascending: false })
    .limit(200)

  if (type) query = query.eq('type', type)
  if (from) query = query.gte('created_at', from)
  if (to)   query = query.lte('created_at', to + 'T23:59:59')

  const { data, error } = await query

  if (error) {
    console.error('[statement] Error:', error)
    return NextResponse.json({ error: 'Error al obtener el estado de cuenta' }, { status: 500 })
  }

  // Saldo actual = balance_after del movimiento más reciente
  const balance = data?.[0]?.balance_after ?? 0

  return NextResponse.json({ balance, entries: data ?? [] })
}
