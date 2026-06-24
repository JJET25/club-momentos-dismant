import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { password } = await req.json()
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: member } = await supabase
    .from('members')
    .select('id, password_hash')
    .eq('id', session.sub)
    .single()

  if (!member) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  // Solo permite este endpoint si la cuenta no tiene contraseña todavía
  if (member.password_hash) {
    return NextResponse.json(
      { error: 'Tu cuenta ya tiene contraseña. Usa "Cambiar contraseña" desde la configuración.' },
      { status: 400 }
    )
  }

  const hash = await bcrypt.hash(password, 12)
  const { error } = await supabase
    .from('members')
    .update({ password_hash: hash })
    .eq('id', session.sub)

  if (error) return NextResponse.json({ error: 'Error al guardar la contraseña' }, { status: 500 })

  return NextResponse.json({ success: true })
}
