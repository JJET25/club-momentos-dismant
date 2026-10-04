import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { verifyOTP, revokeSessions } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { getRequestTenant } from '@/lib/tenant-server'
import { findAccountForTenant, lookupErrorMessage } from '@/lib/accounts'

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
  const tenant = await getRequestTenant()

  // Desde la página de inicio la contraseña nueva aplica a todas las cuentas
  // activas del correo (el código enviado al correo prueba que es su dueño)
  if (tenant.kind === 'hub') {
    const newHash = await bcrypt.hash(newPassword, 12)
    const { data, error } = await supabase
      .from('members')
      .update({ password_hash: newHash })
      .eq('email', email.toLowerCase().trim())
      .neq('status', 'suspended')
      .select('id')
    if (error) return NextResponse.json({ error: 'Error al guardar la contraseña. Intenta de nuevo.' }, { status: 500 })
    if (!data?.length) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
    // Contraseña restablecida = cualquier sesión abierta deja de valer
    await revokeSessions(data.map(r => r.id))
    return NextResponse.json({ success: true })
  }

  // En un portal: solo la cuenta de ese portal (la de la otra empresa no se toca)
  const lookup = await findAccountForTenant(supabase, email, tenant)

  if (!lookup.account) {
    const message = lookupErrorMessage(lookup) ?? 'Cuenta no encontrada'
    return NextResponse.json({ error: message }, { status: lookup.reason === 'not_found' ? 404 : 409 })
  }
  const member = lookup.account

  const newHash = await bcrypt.hash(newPassword, 12)
  const { error: updateError } = await supabase
    .from('members')
    .update({ password_hash: newHash })
    .eq('id', member.id)

  if (updateError) {
    console.error('[reset-password] Error al actualizar contraseña:', updateError)
    return NextResponse.json({ error: 'Error al guardar la contraseña. Intenta de nuevo.' }, { status: 500 })
  }

  await revokeSessions(member.id)
  return NextResponse.json({ success: true })
}
