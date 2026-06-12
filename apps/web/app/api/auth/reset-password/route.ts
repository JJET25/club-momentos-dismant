import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { verifyOTP } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { email, otp, newPassword } = await req.json()
  if (!email || !otp || !newPassword) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  }

  const valid = await verifyOTP(email.toLowerCase().trim(), otp.trim())
  if (!valid) return NextResponse.json({ error: 'Código inválido o expirado' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })

  const newHash = await bcrypt.hash(newPassword, 12)
  const { error: updateError } = await supabase
    .from('members')
    .update({ password_hash: newHash })
    .eq('id', member.id)

  if (updateError) {
    console.error('[reset-password] Error al actualizar contraseña:', updateError)
    return NextResponse.json({ error: 'Error al guardar la contraseña. Intenta de nuevo.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
