import { MANAGER_ROLES } from '@/lib/permissions'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { sendEmail, buildInvitationEmail } from '@/lib/resend'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session || !MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { email, recipientName } = await req.json()

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Correo requerido' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const supabase = createAdminClient()

  // Verificar que no sea ya miembro
  const { data: existing } = await supabase
    .from('members')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Este correo ya tiene una cuenta registrada' }, { status: 409 })
  }

  // Invalidar invitaciones previas no usadas para el mismo correo
  await supabase
    .from('invitations')
    .update({ used: true, used_at: new Date().toISOString() })
    .eq('email', normalizedEmail)
    .eq('used', false)

  const id = crypto.randomUUID()
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días

  const { error } = await supabase.from('invitations').insert({
    id,
    email: normalizedEmail,
    token,
    sent_by: session.sub,
    expires_at: expiresAt.toISOString(),
  })

  if (error) {
    console.error('[invitations] Error al crear invitación:', error)
    return NextResponse.json({ error: 'Error al crear la invitación' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const inviteLink = `${appUrl}/register?token=${token}`

  if (process.env.RESEND_API_KEY) {
    await sendEmail({
      to: normalizedEmail,
      subject: `${session.name} te invita al Club Momentos Dismant`,
      html: buildInvitationEmail({
        inviteLink,
        recipientName: recipientName?.trim() || undefined,
        senderName: session.name,
      }),
    })
  } else {
    console.log('[DEV] Invitation link:', inviteLink)
  }

  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      'invitation.sent',
    target_type: 'invitation',
    target_id:   id,
    metadata:    { email: normalizedEmail },
  })

  return NextResponse.json({ success: true, email: normalizedEmail, inviteLink })
}

export async function GET(req: NextRequest) {
  const session = await getSession()

  if (!session || !MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 20
  const offset = (page - 1) * limit

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('invitations')
    .select('id, email, used, used_at, expires_at, created_at, sent_by')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: 'Error al obtener invitaciones' }, { status: 500 })
  }

  return NextResponse.json({ invitations: data })
}
