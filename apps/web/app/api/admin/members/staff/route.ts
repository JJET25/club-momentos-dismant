import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { GLOBAL_ROLE_LOCKED_MESSAGE } from '@/lib/permissions'
import { createAdminClient } from '@/lib/supabase'
import { sendEmail, buildMagicLinkEmail } from '@/lib/resend'
import { getBrand } from '@/lib/brand'
import { isAffiliate } from '@/lib/scope'
import { createPass, passUrl } from '@/lib/passes'
import { normalizeAffiliates, setStaffAffiliates, SCOPED_STAFF_ROLES } from '@/lib/accounts'
import crypto from 'crypto'

/** GET — Lista todos los miembros del equipo interno (owner, admin, team_admin, employee) */
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Solo el Propietario puede ver este recurso' }, { status: 403 })
  }

  const supabase = createAdminClient()

  const { data: roles } = await supabase
    .from('roles')
    .select('id, name')
    .in('name', ['owner', 'admin', 'team_admin', 'employee'])

  if (!roles?.length) return NextResponse.json([])

  const roleIds  = roles.map(r => r.id)
  const roleById = Object.fromEntries(roles.map(r => [r.id, r.name]))

  const { data: members, error } = await supabase
    .from('members')
    .select('id, full_name, email, company_name, role_id, status, created_at, last_login_at, affiliate')
    .in('role_id', roleIds)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: 'Error al obtener el equipo' }, { status: 500 })

  // Empresas asignadas (empleados y admins. de equipo pueden tener una o ambas)
  const { data: assignments } = await supabase
    .from('staff_affiliates')
    .select('member_id, affiliate')
    .in('member_id', (members ?? []).map(m => m.id))
  const affiliatesById = new Map<string, string[]>()
  for (const a of assignments ?? []) {
    affiliatesById.set(a.member_id, [...(affiliatesById.get(a.member_id) ?? []), a.affiliate])
  }

  return NextResponse.json(
    (members ?? []).map(m => ({
      ...m,
      role: roleById[m.role_id] ?? m.role_id,
      affiliates: affiliatesById.get(m.id) ?? [m.affiliate],
    }))
  )
}

/** POST — Crea un nuevo miembro del equipo interno sin invitación */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'owner') {
    return NextResponse.json({ error: 'Solo el Propietario puede crear miembros del equipo' }, { status: 403 })
  }

  const body = await req.json()
  const { full_name, email, role } = body
  // Empleados y admins. de equipo: una o ambas empresas. Admin: global, la
  // empresa solo define el branding de sus correos.
  const isScoped = SCOPED_STAFF_ROLES.includes(role)
  const affiliates = isScoped
    ? normalizeAffiliates(body.affiliates ?? (body.affiliate ? [body.affiliate] : []))
    : []
  const affiliate = isScoped ? affiliates[0] : body.affiliate

  if (!full_name?.trim() || !email?.trim() || !role) {
    return NextResponse.json({ error: 'Nombre, correo y rol son obligatorios' }, { status: 400 })
  }
  if (role === 'admin') {
    return NextResponse.json({ error: GLOBAL_ROLE_LOCKED_MESSAGE }, { status: 403 })
  }
  if (!['team_admin', 'employee'].includes(role)) {
    return NextResponse.json({ error: 'Rol inválido. Solo se puede crear admin, administrador de equipo o empleado.' }, { status: 400 })
  }
  if (!isAffiliate(affiliate)) {
    return NextResponse.json({ error: 'Debes elegir al menos una empresa (Dismant o Lauti)' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: roleRow, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', role)
    .single()

  if (roleError || !roleRow) {
    console.error('[POST /staff] roles query error:', roleError)
    return NextResponse.json({ error: 'Rol no encontrado en la base de datos' }, { status: 400 })
  }

  // RFC único auto-generado para cuentas internas (no son clientes)
  const internalRfc = `STFF${crypto.randomUUID().replace(/-/g, '').slice(0, 9).toUpperCase()}`

  const { data: member, error } = await supabase
    .from('members')
    .insert({
      id:             crypto.randomUUID(),
      email:          email.toLowerCase().trim(),
      full_name:      full_name.trim(),
      company_name:   getBrand(affiliate).short,
      rfc:            internalRfc,
      location_state: 'Ciudad de México',
      location_city:  'CDMX',
      role_id:        roleRow.id,
      affiliate,
      status:         'active',
    })
    .select('id, full_name, email, role_id, status, affiliate')
    .single()

  if (error) {
    console.error('[POST /staff] insert error:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese correo.' }, { status: 409 })
    }
    return NextResponse.json({ error: `Error al crear el miembro: ${error.message}` }, { status: 500 })
  }

  if (isScoped) {
    const { error: assignError } = await setStaffAffiliates(supabase, member.id, affiliates, affiliate)
    if (assignError) console.error('[POST /staff] staff_affiliates error:', assignError)
  }

  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      'staff.created',
    target_type: 'member',
    target_id:   member.id,
    metadata:    { role, affiliate, affiliates, email: email.toLowerCase().trim() },
  })

  // Enviar correo de bienvenida con magic link para que configure su contraseña
  try {
    // Enlace de un solo uso al panel central para que configure su contraseña
    const magicLink = passUrl(await createPass(supabase, member.id, 'magic_link'), role, affiliate)

    await sendEmail({
      to: member.email,
      subject: `Bienvenido al equipo — accede y configura tu contraseña`,
      affiliate,
      html: buildMagicLinkEmail(magicLink, member.full_name, affiliate),
    })
  } catch (emailErr) {
    console.error('[staff] Error enviando correo de bienvenida:', emailErr)
  }

  return NextResponse.json({ ...member, role, affiliates: isScoped ? affiliates : [affiliate] })
}
