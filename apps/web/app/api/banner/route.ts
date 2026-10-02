import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { getMemberAffiliate } from '@/lib/scope'
import { getRequestTenant } from '@/lib/tenant-server'

// Endpoint público — no requiere autenticación. Devuelve el banner de la
// empresa del miembro (o la del portal, si no hay sesión).
export async function GET() {
  const session = await getSession()
  const tenant = await getRequestTenant()
  const affiliate = session?.role === 'member'
    ? getMemberAffiliate(session)
    : tenant.kind === 'brand' ? tenant.affiliate : null

  if (!affiliate) return NextResponse.json({ banner: null })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('global_banners')
    .select('id, message')
    .eq('affiliate', affiliate)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ banner: data ?? null })
}
