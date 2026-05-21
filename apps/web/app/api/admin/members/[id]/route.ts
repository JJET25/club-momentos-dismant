import { STAFF_ROLES } from '@/lib/permissions'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'


export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !STAFF_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const [memberRes, ledgerRes, redemptionsRes, invoicesRes] = await Promise.all([
    supabase
      .from('members')
      .select('id, full_name, company_name, rfc, email, location_state, location_city, status, created_at')
      .eq('id', id)
      .single(),
    supabase
      .from('ledger_entries')
      .select('id, type, points, balance_after, description, created_at')
      .eq('member_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('redemptions')
      .select('id, points_spent, voucher_code, status, created_at, reward_skus!sku_id(name)')
      .eq('member_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('invoices')
      .select('id, uuid_cfdi, total_mxn, status, points_generated, created_at')
      .eq('member_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (!memberRes.data) {
    return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })
  }

  const balance = ledgerRes.data?.[0]?.balance_after ?? 0

  return NextResponse.json({
    member:      memberRes.data,
    balance,
    ledger:      ledgerRes.data ?? [],
    redemptions: redemptionsRes.data ?? [],
    invoices:    invoicesRes.data ?? [],
  })
}
