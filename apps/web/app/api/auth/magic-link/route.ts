import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { createMagicLinkToken } from '@/lib/auth'
import { sendEmail, buildMagicLinkEmail } from '@/lib/resend'
import { getBrand } from '@/lib/brand'
import { getRequestTenant } from '@/lib/tenant-server'
import { getHomeBaseUrl } from '@/lib/tenant'
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
  const token = await createMagicLinkToken(member.id, member.email)
  // El enlace apunta al dominio donde opera la cuenta (portal de su empresa o panel)
  const magicLink = `${getHomeBaseUrl(role, member.affiliate)}/api/auth/verify-magic-link?token=${token}`

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
