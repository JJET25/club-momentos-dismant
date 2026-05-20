import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { createSessionToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, fullName, companyName, rfc, locationState, locationCity, invitationCode } =
    await req.json()

  if (!email || !fullName || !companyName || !rfc || !locationState || !locationCity) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Obtener el role_id de "member"
  const { data: role } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'member')
    .single()

  if (!role) return NextResponse.json({ error: 'Error de configuración del sistema' }, { status: 500 })

  // Crear el miembro
  const { data: member, error } = await supabase
    .from('members')
    .insert({
      email: email.toLowerCase().trim(),
      full_name: fullName.trim(),
      company_name: companyName.trim(),
      rfc: rfc.toUpperCase().trim(),
      location_state: locationState,
      location_city: locationCity.trim(),
      invitation_code: invitationCode?.trim() || null,
      role_id: role.id,
    })
    .select('id, email, full_name')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'El correo o RFC ya está registrado' }, { status: 409 })
    }
    console.error('[register] Error al crear miembro:', error)
    return NextResponse.json({ error: 'Error al crear la cuenta' }, { status: 500 })
  }

  // Bono de bienvenida en el ledger
  const welcomePoints = parseInt(process.env.WELCOME_BONUS_POINTS ?? '100')
  await supabase.from('ledger_entries').insert({
    member_id: member.id,
    type: 'welcome_bonus',
    points: welcomePoints,
    balance_after: welcomePoints,
    description: 'Bono de bienvenida al Club Momentos Dismant',
  })

  // Registrar en audit_log
  await supabase.from('audit_log').insert({
    actor_id: member.id,
    action: 'member.registered',
    target_type: 'member',
    target_id: member.id,
  })

  // Crear sesión JWT
  const token = await createSessionToken({
    sub: member.id,
    email: member.email,
    role: 'member',
    name: member.full_name,
  })

  const response = NextResponse.json({ success: true })
  response.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return response
}
