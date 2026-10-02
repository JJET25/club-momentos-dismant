import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { sendEmail, buildMagicLinkEmail } from '@/lib/resend'
import { getBrand } from '@/lib/brand'
import { getRequestTenant } from '@/lib/tenant-server'
import { createPass, passUrl } from '@/lib/passes'
import { findAccountForTenant } from '@/lib/accounts'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

  const supabase = createAdminClient()
  const lookup = await findAccountForTenant(supabase, email, await getRequestTenant())

  // Respuesta genérica siempre para prevenir enumeración de emails
  if (!lookup.account || lookup.account.status === 'suspended') {
    return NextResponse.json({ success: true })
  }

  const { account: member, role } = lookup
  // Enlace de un solo uso (15 min) en el dominio donde opera la cuenta
  const token = await createPass(supabase, member.id, 'magic_link')
  const magicLink = passUrl(token, role, member.affiliate)

  if (process.env.RESEND_API_KEY) {
    try {
      await sendEmail({
        to:        member.email,
        subject:   `Tu enlace de acceso — ${getBrand(member.affiliate).name}`,
        html:      buildMagicLinkEmail(magicLink, member.full_name, member.affiliate),
        affiliate: member.affiliate,
      })
    } catch {
      // Dominio no verificado o error de Resend en dev — mostrar en consola
      console.log(`[DEV] Magic Link para ${member.email}: ${magicLink}`)
    }
  } else {
    console.log(`[DEV] Magic Link para ${member.email}: ${magicLink}`)
  }

  return NextResponse.json({ success: true })
}
