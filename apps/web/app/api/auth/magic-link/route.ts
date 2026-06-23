import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { createMagicLinkToken } from '@/lib/auth'
import { sendEmail, buildMagicLinkEmail } from '@/lib/resend'
import { getBrand } from '@/lib/brand'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: member } = await supabase
    .from('members')
    .select('id, email, full_name, status, affiliate')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  // Respuesta genérica siempre para prevenir enumeración de emails
  if (!member || member.status === 'suspended') {
    return NextResponse.json({ success: true })
  }

  const token = await createMagicLinkToken(member.id, member.email)
  const magicLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify-magic-link?token=${token}`

  if (process.env.RESEND_API_KEY) {
    try {
      await sendEmail({
        to:        member.email,
        subject:   `Tu enlace de acceso — ${getBrand((member as { affiliate?: string }).affiliate).name}`,
        html:      buildMagicLinkEmail(magicLink, member.full_name, (member as { affiliate?: string }).affiliate),
        affiliate: (member as { affiliate?: string }).affiliate,
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
