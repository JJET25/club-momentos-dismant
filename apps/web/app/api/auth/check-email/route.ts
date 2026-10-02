import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getRequestTenant } from '@/lib/tenant-server'
import { isAffiliate } from '@/lib/tenant'

/**
 * ¿Ya existe una cuenta con este correo EN ESTA EMPRESA? El email es único
 * por empresa, así que alguien que ya es miembro de Lauti puede registrarse
 * en Dismant con una invitación de Dismant.
 */
export async function POST(req: NextRequest) {
  const { email, affiliate: bodyAffiliate } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

  const tenant = await getRequestTenant()
  const affiliate = tenant.kind === 'brand'
    ? tenant.affiliate
    : (isAffiliate(bodyAffiliate) ? bodyAffiliate : null)

  const supabase = createAdminClient()
  let query = supabase
    .from('members')
    .select('id')
    .eq('email', email.toLowerCase().trim())
  if (affiliate) query = query.eq('affiliate', affiliate)
  const { data } = await query.limit(1)

  return NextResponse.json({ exists: !!data?.length })
}
