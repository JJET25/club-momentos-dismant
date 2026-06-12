import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { createSessionToken } from '@/lib/auth'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const { email, fullName, companyName, rfc, locationState, locationCity, phone, password, inviteToken } =
    await req.json()

  if (!email || !fullName || !companyName || !rfc || !locationState || !locationCity || !password) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  }

  if (!inviteToken) {
    return NextResponse.json({ error: 'Se requiere una invitación válida' }, { status: 403 })
  }

  const supabase = createAdminClient()

  // Validar el token de invitación
  const { data: invitation } = await supabase
    .from('invitations')
    .select('id, email, used, expires_at')
    .eq('token', inviteToken)
    .maybeSingle()

  if (!invitation || invitation.used || new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: 'La invitación no es válida o ya fue utilizada' }, { status: 403 })
  }

  // El email del registro debe coincidir con el de la invitación
  if (invitation.email !== email.toLowerCase().trim()) {
    return NextResponse.json({ error: 'El correo no coincide con la invitación' }, { status: 403 })
  }

  // Obtener el role_id de "member"
  const { data: role } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'member')
    .single()

  if (!role) return NextResponse.json({ error: 'Error de configuración del sistema' }, { status: 500 })

  const passwordHash = await bcrypt.hash(password, 12)

  // Crear el miembro
  const { data: member, error } = await supabase
    .from('members')
    .insert({
      id:            crypto.randomUUID(),
      email:         email.toLowerCase().trim(),
      full_name:     fullName.trim(),
      company_name:  companyName.trim(),
      rfc:           rfc.toUpperCase().trim(),
      location_state: locationState,
      location_city:  locationCity.trim(),
      phone:          phone?.trim() || null,
      password_hash:  passwordHash,
      role_id:       role.id,
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

  // Marcar la invitación como usada
  await supabase
    .from('invitations')
    .update({ used: true, used_at: new Date().toISOString() })
    .eq('id', invitation.id)

  // Bono de bienvenida en el ledger
  const welcomePoints = parseInt(process.env.WELCOME_BONUS_POINTS ?? '100')
  await supabase.from('ledger_entries').insert({
    id:            crypto.randomUUID(),
    member_id:     member.id,
    type:          'welcome_bonus',
    points:        welcomePoints,
    balance_after: welcomePoints,
    description:   'Bono de bienvenida al Club Momentos Dismant',
  })

  // Registrar en audit_log
  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    member.id,
    action:      'member.registered',
    target_type: 'member',
    target_id:   member.id,
    metadata:    { invite_used: invitation.id },
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
