import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getAffiliateBaseUrl, getAffiliateHost, isAffiliate } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ valid: false, reason: 'token-missing' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data } = await supabase
    .from('invitations')
    .select('id, email, used, expires_at, affiliate')
    .eq('token', token)
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ valid: false, reason: 'token-invalid' })
  }

  if (data.used) {
    return NextResponse.json({ valid: false, reason: 'token-used' })
  }

  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, reason: 'token-expired' })
  }

  const affiliate = isAffiliate(data.affiliate) ? data.affiliate : 'dismant'
  // Dominio donde debe completarse el registro; la página redirige si el
  // enlace se abrió en otro (p. ej. el dominio anterior). Solo cuando la
  // empresa ya tiene dominio propio configurado.
  const portalUrl = getAffiliateHost(affiliate) ? getAffiliateBaseUrl(affiliate) : null

  return NextResponse.json({ valid: true, email: data.email, affiliate, portalUrl })
}
