import { STAFF_ROLES } from '@/lib/permissions'
import { getEffectiveAffiliate } from '@/lib/scope'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import crypto from 'crypto'

/** GET — Detalle completo de un miembro */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !STAFF_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  const affiliate = getEffectiveAffiliate(session, req)
  const supabase = createAdminClient()

  const [memberRes, ledgerRes, redemptionsRes, invoicesRes] = await Promise.all([
    supabase
      .from('members')
      .select('id, full_name, company_name, rfc, email, location_state, location_city, status, created_at, affiliate, roles!role_id(name)')
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

  const targetRole = (memberRes.data?.roles as unknown as { name: string } | null)?.name

  // El filtro de perspectiva solo aplica a clientes: el roster de staff
  // (Equipo) es siempre global, no depende de la perspectiva elegida.
  if (
    !memberRes.data ||
    (targetRole === 'member' && affiliate && memberRes.data.affiliate !== affiliate)
  ) {
    return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })
  }

  const balance = ledgerRes.data?.[0]?.balance_after ?? 0
  const { roles, ...memberFields } = memberRes.data as typeof memberRes.data & { roles: { name: string } | null }

  return NextResponse.json({
    member:      { ...memberFields, role: roles?.name ?? 'member' },
    balance,
    ledger:      ledgerRes.data ?? [],
    redemptions: redemptionsRes.data ?? [],
    invoices:    invoicesRes.data ?? [],
  })
}

/** PATCH — Edita nombre y/o correo de un miembro del equipo interno */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Solo el Propietario puede editar cuentas del equipo' }, { status: 403 })
  }

  const { id } = await params
  const { full_name, email } = await req.json()

  if (!full_name?.trim() && !email?.trim()) {
    return NextResponse.json({ error: 'Proporciona al menos un campo a actualizar' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // No permitir editar cuentas de clientes (miembros con rol member)
  const { data: target } = await supabase
    .from('members')
    .select('id, role_id, roles!role_id(name)')
    .eq('id', id)
    .single()

  const targetRole = (target?.roles as unknown as { name: string } | null)?.name
  if (!target || targetRole === 'member') {
    return NextResponse.json({ error: 'Solo se pueden editar cuentas del equipo' }, { status: 403 })
  }

  const updates: Record<string, string> = {}
  if (full_name?.trim()) updates.full_name = full_name.trim()
  if (email?.trim())     updates.email     = email.toLowerCase().trim()

  const { error } = await supabase.from('members').update(updates).eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ese correo ya está en uso.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }

  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      'staff.updated',
    target_type: 'member',
    target_id:   id,
    metadata:    updates,
  })

  return NextResponse.json({ ok: true })
}

/** DELETE — Elimina un miembro del equipo si no tiene registros asociados */
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Solo el Propietario puede eliminar cuentas' }, { status: 403 })
  }

  const { id } = await params

  if (id === session.sub) {
    return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verificar que no sea un cliente (miembro con rol member)
  const { data: target } = await supabase
    .from('members')
    .select('id, full_name, role_id, roles!role_id(name)')
    .eq('id', id)
    .single()

  const targetRole = (target?.roles as unknown as { name: string } | null)?.name
  if (!target || targetRole === 'member') {
    return NextResponse.json({ error: 'Solo se pueden eliminar cuentas del equipo' }, { status: 403 })
  }

  // Verificar que no tenga registros en audit_log como actor (indicaría actividad real)
  const { count: auditCount } = await supabase
    .from('audit_log')
    .select('id', { count: 'exact', head: true })
    .eq('actor_id', id)

  if ((auditCount ?? 0) > 0) {
    // Tiene actividad — solo dejar desactivar, no eliminar
    return NextResponse.json({
      error: 'Esta cuenta tiene actividad registrada. Desactívala en lugar de eliminarla para conservar la trazabilidad.',
      canDeactivate: true,
    }, { status: 409 })
  }

  const { error } = await supabase.from('members').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Error al eliminar la cuenta' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
