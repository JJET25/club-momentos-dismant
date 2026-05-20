import { NextRequest, NextResponse } from 'next/server'
import { verifyOTP } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, code } = await req.json()
  if (!email || !code) {
    return NextResponse.json({ error: 'Email y código requeridos' }, { status: 400 })
  }

  const valid = await verifyOTP(email.toLowerCase().trim(), code.trim())
  if (!valid) {
    return NextResponse.json({ error: 'Código inválido o expirado' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
