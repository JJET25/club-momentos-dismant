import { NextRequest, NextResponse } from 'next/server'
import { generateAndStoreOTP } from '@/lib/auth'
import { sendEmail, buildOTPEmail } from '@/lib/resend'
import { createAdminClient } from '@/lib/supabase'
import { getBrand } from '@/lib/brand'
import { getRequestTenant } from '@/lib/tenant-server'
import { isAffiliate } from '@/lib/tenant'
import { findAccountForTenant } from '@/lib/accounts'

export async function POST(req: NextRequest) {
  const { email, name, affiliate: bodyAffiliate } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

  const normalizedEmail = email.toLowerCase().trim()
  const code = await generateAndStoreOTP(normalizedEmail)

  // Marca del correo: la del portal desde el que se pide; en el dominio
  // anterior, la de la cuenta existente o la de la invitación (registro).
  const tenant = await getRequestTenant()
  let affiliate: string | undefined
  if (tenant.kind === 'brand') {
    affiliate = tenant.affiliate
  } else {
    const lookup = await findAccountForTenant(createAdminClient(), normalizedEmail, tenant)
    affiliate = lookup.account?.affiliate ?? (isAffiliate(bodyAffiliate) ? bodyAffiliate : undefined)
  }
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
