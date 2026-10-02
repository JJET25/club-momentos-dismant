import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase'
import { getRequestTenant } from '@/lib/tenant-server'
import {
  findAccountsByEmail, pickAccountForTenant, authenticateAcrossAccounts,
  buildSessionToken, setSessionOnResponse,
} from '@/lib/accounts'
import { createPass, passUrl } from '@/lib/passes'
import { clientIp, isLoginBlocked, recordFailedLogin, BLOCKED_MESSAGE } from '@/lib/rate-limit'

const INVALID = 'Correo o contraseña incorrectos'

/**
 * Inicio de sesión. Siempre deja a la persona DENTRO de la aplicación:
 * - En el portal correcto: crea la sesión aquí mismo.
 * - En la página de inicio, en un portal que no es el de su cuenta, o con
 *   varias cuentas en el mismo correo: valida la contraseña contra todas,
 *   elige la última usada y la manda a su dominio con un pase de un solo uso.
 */
export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const ip = clientIp(req)
  if (await isLoginBlocked(supabase, email, ip)) {
    return NextResponse.json({ error: BLOCKED_MESSAGE }, { status: 429 })
  }

  const tenant = await getRequestTenant()
  const rows = await findAccountsByEmail(supabase, email)
  const lookup = tenant.kind === 'hub' ? null : pickAccountForTenant(rows, tenant)

  // Cuenta de este portal: sesión aquí mismo
  if (lookup?.account) {
    const { account: member, role } = lookup
    if (member.status === 'suspended') return NextResponse.json({ error: INVALID }, { status: 401 })
    // Staff sin contraseña → pedir que use "Olvidé mi contraseña" para configurarla
    if (!member.password_hash) return NextResponse.json({ noPassword: true })
    if (!(await bcrypt.compare(password, member.password_hash))) {
      await recordFailedLogin(supabase, email, ip)
      return NextResponse.json({ error: INVALID }, { status: 401 })
    }

    await supabase.from('members').update({ last_login_at: new Date().toISOString() }).eq('id', member.id)
    const token = await buildSessionToken(supabase, member, role)
    const redirectTo = role === 'member' ? '/dashboard' : '/admin/dashboard'
    return setSessionOnResponse(NextResponse.json({ success: true, redirectTo }), token)
  }

  // Página de inicio, portal equivocado o varias cuentas: entrar por pase
  const result = await authenticateAcrossAccounts(rows, password)
  if (!result.account) {
    if (result.reason === 'no_password') return NextResponse.json({ noPassword: true })
    await recordFailedLogin(supabase, email, ip)
    return NextResponse.json({ error: INVALID }, { status: 401 })
  }

  const pass = await createPass(supabase, result.account.id, 'login')
  return NextResponse.json({ success: true, redirectTo: passUrl(pass, result.role, result.account.affiliate) })
}
