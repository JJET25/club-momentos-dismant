import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { getSession, revokeSessions } from '@/lib/auth'
import { buildSessionToken, setSessionOnResponse } from '@/lib/accounts'
import { createAdminClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { currentPassword, newPassword } = await req.json()
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: member } = await supabase
    .from('members')
    .select('id, email, full_name, affiliate, password_hash')
    .eq('id', session.sub)
    .single()

  if (!member) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  if (!member.password_hash) {
    return NextResponse.json(
      { error: 'No tienes contraseña configurada. Usa "Olvidé mi contraseña" para establecer una.' },
      { status: 400 }
    )
  }

  const valid = await bcrypt.compare(currentPassword, member.password_hash)
  if (!valid) return NextResponse.json({ error: 'La contraseña actual es incorrecta' }, { status: 400 })

  if (await bcrypt.compare(newPassword, member.password_hash)) {
    return NextResponse.json({ error: 'La nueva contraseña debe ser distinta a la actual' }, { status: 400 })
  }

  const newHash = await bcrypt.hash(newPassword, 12)
  const { error } = await supabase.from('members').update({ password_hash: newHash }).eq('id', session.sub)
  if (error) return NextResponse.json({ error: 'Error al guardar la contraseña' }, { status: 500 })

  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      'account.password_changed',
    target_type: 'member',
    target_id:   session.sub,
  })

  // Las demás sesiones abiertas (otros dispositivos) dejan de ser válidas;
  // la actual se vuelve a emitir con la versión nueva para no sacar al usuario
  await revokeSessions(session.sub)
  const res = NextResponse.json({ success: true })
  return setSessionOnResponse(res, await buildSessionToken(supabase, member, session.role))
}
