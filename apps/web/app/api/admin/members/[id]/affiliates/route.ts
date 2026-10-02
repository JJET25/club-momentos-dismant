import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { normalizeAffiliates, setStaffAffiliates, SCOPED_STAFF_ROLES } from '@/lib/accounts'

/**
 * PUT — Empresas a las que tiene acceso un empleado / admin. de equipo.
 * Body: { affiliates: ('dismant' | 'lauti')[] }. Solo el Propietario.
 * El cambio aplica en el siguiente inicio de sesión de esa cuenta.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Solo el Propietario puede asignar empresas' }, { status: 403 })
  }

  const { id } = await params
  const affiliates = normalizeAffiliates((await req.json()).affiliates)
  if (!affiliates.length) {
    return NextResponse.json({ error: 'Asigna al menos una empresa (Dismant o Lauti)' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: target } = await supabase
    .from('members')
    .select('id, affiliate, roles!role_id(name)')
    .eq('id', id)
    .maybeSingle()

  const role = (target?.roles as unknown as { name: string } | null)?.name
  if (!target || !role || !SCOPED_STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Solo se asignan empresas a empleados y administradores de equipo' }, { status: 400 })
  }

  const { error } = await setStaffAffiliates(supabase, id, affiliates, target.affiliate)
  if (error) return NextResponse.json({ error }, { status: 500 })

  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      'staff.affiliates_changed',
    target_type: 'member',
    target_id:   id,
    metadata:    { affiliates },
  })

  return NextResponse.json({ ok: true, affiliates })
}
