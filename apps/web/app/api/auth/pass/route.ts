import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getRequestTenant } from '@/lib/tenant-server'
import { getHomeBaseUrl, requestOrigin } from '@/lib/tenant'
import { ACCOUNT_SELECT, roleOf, buildSessionToken, setSessionOnResponse, type AccountRow } from '@/lib/accounts'
import { peekPass, consumePass } from '@/lib/passes'

/**
 * Canje de un pase de un solo uso: crea la sesión en ESTE dominio y entra a
 * la aplicación. Si el pase se abrió en un dominio que no es el de la cuenta,
 * se reenvía sin canjearlo al dominio correcto.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? ''
  const origin = requestOrigin(req)
  const loginUrl = new URL('/login', origin)
  const supabase = createAdminClient()

  const peek = token ? await peekPass(supabase, token) : null
  if (!peek) {
    loginUrl.searchParams.set('error', 'link-expirado')
    return NextResponse.redirect(loginUrl)
  }

  const { data } = await supabase.from('members').select(ACCOUNT_SELECT).eq('id', peek.member_id).maybeSingle()
  const account = data as unknown as AccountRow | null
  if (!account || account.status === 'suspended') {
    loginUrl.searchParams.set('error', 'cuenta-suspendida')
    return NextResponse.redirect(loginUrl)
  }

  const role = roleOf(account)
  const tenant = await getRequestTenant()
  const homeBase = getHomeBaseUrl(role, account.affiliate)
  const onWrongDomain =
    tenant.kind === 'hub' ||
    (tenant.kind === 'brand' && (role !== 'member' || tenant.affiliate !== account.affiliate)) ||
    (tenant.kind === 'admin' && role === 'member')
  if (onWrongDomain && new URL(homeBase).host !== new URL(origin).host) {
    return NextResponse.redirect(new URL(`/api/auth/pass?token=${encodeURIComponent(token)}`, homeBase))
  }

  // Canje atómico: un segundo intento con el mismo pase ya no encuentra nada
  const pass = await consumePass(supabase, token)
  if (!pass) {
    loginUrl.searchParams.set('error', 'link-expirado')
    return NextResponse.redirect(loginUrl)
  }

  await supabase.from('members').update({ last_login_at: new Date().toISOString() }).eq('id', account.id)
  const session = await buildSessionToken(supabase, account, role)

  const needsPasswordSetup = !account.password_hash && role !== 'member'
  const destination = needsPasswordSetup
    ? '/admin/setup-password'
    : pass.next_path ?? (role === 'member' ? '/dashboard' : '/admin/dashboard')

  return setSessionOnResponse(NextResponse.redirect(new URL(destination, origin)), session)
}
