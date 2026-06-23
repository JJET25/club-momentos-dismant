import { NextRequest, NextResponse } from 'next/server'
import { generateAndStoreOTP } from '@/lib/auth'
import { sendEmail, buildOTPEmail } from '@/lib/resend'
import { createAdminClient } from '@/lib/supabase'
import { getBrand } from '@/lib/brand'

export async function POST(req: NextRequest) {
  const { email, name } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

  const normalizedEmail = email.toLowerCase().trim()
  const code = await generateAndStoreOTP(normalizedEmail)

  const supabase = createAdminClient()
  const { data: member } = await supabase
    .from('members')
    .select('affiliate')
    .eq('email', normalizedEmail)
    .maybeSingle()
  const affiliate = (member as { affiliate?: string } | null)?.affiliate
  const brandName = getBrand(affiliate).name

  if (process.env.RESEND_API_KEY) {
    try {
      await sendEmail({
        to:        email,
        subject:   `Tu código de verificación — ${brandName}`,
        html:      buildOTPEmail(code, name, affiliate),
        affiliate,
      })
    } catch {
      // Dominio no verificado o error de Resend en dev — mostrar en consola
      console.log(`[DEV] OTP para ${email}: ${code}`)
    }
  } else {
    console.log(`[DEV] OTP para ${email}: ${code}`)
  }

  return NextResponse.json({ success: true })
}
