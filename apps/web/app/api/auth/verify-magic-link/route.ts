import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { verifyMagicLinkToken } from '@/lib/auth'
import { getRequestTenant } from '@/lib/tenant-server'
import { getHomeBaseUrl, requestOrigin } from '@/lib/tenant'
import { ACCOUNT_SELECT, roleOf, buildSessionToken, setSessionOnResponse, type AccountRow } from '@/lib/accounts'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const origin = requestOrigin(req)
  const loginUrl = new URL('/login', origin)

  if (!token) {
    loginUrl.searchParams.set('error', 'link-invalido')
    return NextResponse.redirect(loginUrl)
  }

  const payload = await verifyMagicLinkToken(token)
  if (!payload) {
    loginUrl.searchParams.set('error', 'link-expirado')
    return NextResponse.redirect(loginUrl)
  }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('members')
    .select(ACCOUNT_SELECT)
    .eq('id', payload.sub)
    .maybeSingle()
  const member = data as unknown as AccountRow | null

  if (!member || member.status === 'suspended') {
    loginUrl.searchParams.set('error', 'cuenta-suspendida')
    return NextResponse.redirect(loginUrl)
  }

  const role = roleOf(member)

  // La cookie de sesión es por dominio: si el enlace se abrió en un dominio
  // que no es el de esta cuenta (p. ej. un correo enviado antes del cambio de
  // dominio), reenviarlo al dominio correcto para que la sesión quede ahí.
  const tenant = await getRequestTenant()
  const homeBase = getHomeBaseUrl(role, member.affiliate)
  const onWrongDomain =
    (tenant.kind === 'brand' && (role !== 'member' || tenant.affiliate !== member.affiliate)) ||
    (tenant.kind === 'admin' && role === 'member')
  if (onWrongDomain && new URL(homeBase).host !== new URL(origin).host) {
    return NextResponse.redirect(new URL(`/api/auth/verify-magic-link?token=${encodeURIComponent(token)}`, homeBase))
  }

  // Actualizar último login
  await supabase
    .from('members')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', member.id)

  const sessionToken = await buildSessionToken(supabase, member, role)

  // Staff sin contraseña → redirigir a la página de configuración de contraseña
  const needsPasswordSetup = !member.password_hash && role !== 'member'
  const destination = needsPasswordSetup
    ? '/admin/setup-password'
    : role === 'member' ? '/dashboard' : '/admin/dashboard'

  return setSessionOnResponse(NextResponse.redirect(new URL(destination, origin)), sessionToken)
}
