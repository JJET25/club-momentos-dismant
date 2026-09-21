import { STAFF_ROLES } from '@/lib/permissions'
import { GLOBAL_ROLES, getEffectiveAffiliate, isAffiliate } from '@/lib/scope'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'


export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !STAFF_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const q      = searchParams.get('q')?.trim() ?? ''
  const status = searchParams.get('status')?.trim() ?? ''
  const state  = searchParams.get('state')?.trim() ?? ''

  // Filtro de empresa de esta página: solo los roles globales pueden usarlo
  // para acotar sin tocar la perspectiva del sidebar; si no lo mandan (o no
  // aplica), se usa el affiliate efectivo de siempre.
  const affiliateFilter = searchParams.get('affiliate')?.trim() ?? ''
  const affiliate = (GLOBAL_ROLES.includes(session.role) && isAffiliate(affiliateFilter))
    ? affiliateFilter
    : getEffectiveAffiliate(session, req)

  const supabase = createAdminClient()

  // Solo clientes — el equipo interno (owner/admin/team_admin/employee) vive
  // exclusivamente en /admin/team, nunca se mezcla con esta lista.
  let query = supabase
    .from('members')
    .select('id, full_name, company_name, rfc, location_city, location_state, status, created_at, roles!role_id!inner(name)')
    .eq('roles.name', 'member')
    .order('created_at', { ascending: false })
    .limit(100)

  if (affiliate) query = query.eq('affiliate', affiliate)
  if (status)    query = query.eq('status', status)
  if (state)     query = query.eq('location_state', state)
  if (q) {
    query = query.or(`full_name.ilike.%${q}%,rfc.ilike.%${q}%,company_name.ilike.%${q}%`)
  }

  const { data: members, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Error al obtener miembros' }, { status: 500 })
  }

  if (!members || members.length === 0) {
    return NextResponse.json({ members: [] })
  }

  // Balances: última entrada del ledger por miembro
  const memberIds = members.map(m => m.id)

  const { data: invoiceCounts } = await supabase
    .from('invoices')
    .select('member_id')
    .in('member_id', memberIds)

  const { data: ledgerLatest } = await supabase
    .from('ledger_entries')
    .select('member_id, balance_after, created_at')
    .in('member_id', memberIds)
    .order('created_at', { ascending: false })

  // Tomar solo la entrada más reciente por miembro
  const balanceMap: Record<string, number> = {}
  for (const entry of ledgerLatest ?? []) {
    if (!(entry.member_id in balanceMap)) {
      balanceMap[entry.member_id] = entry.balance_after
    }
  }

  const invoiceCountMap: Record<string, number> = {}
  for (const inv of invoiceCounts ?? []) {
    invoiceCountMap[inv.member_id] = (invoiceCountMap[inv.member_id] ?? 0) + 1
  }

  const result = (members as (typeof members[number] & { company_name?: string })[]).map(({ roles, ...m }) => ({
    ...m,
    role:          (roles as unknown as { name: string } | null)?.name ?? 'member',
    balance:       balanceMap[m.id] ?? 0,
    invoiceCount:  invoiceCountMap[m.id] ?? 0,
  }))

  return NextResponse.json({ members: result })
}
