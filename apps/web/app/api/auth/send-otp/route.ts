import { NextRequest, NextResponse } from 'next/server'
import { generateAndStoreOTP } from '@/lib/auth'
import { sendEmail, buildOTPEmail } from '@/lib/resend'

export async function POST(req: NextRequest) {
  const { email, name } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

  const code = await generateAndStoreOTP(email.toLowerCase().trim())

  if (process.env.RESEND_API_KEY) {
    await sendEmail({
      to: email,
      subject: 'Tu código de verificación — Club Momentos Dismant',
      html: buildOTPEmail(code, name),
    })
  } else {
    // En desarrollo sin Resend configurado, mostrar en consola
    console.log(`[DEV] OTP para ${email}: ${code}`)
  }

  return NextResponse.json({ success: true })
}
