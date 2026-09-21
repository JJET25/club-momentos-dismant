import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { STAFF_ROLES } from '@/lib/permissions'
import { getEffectiveAffiliate } from '@/lib/scope'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !STAFF_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'active'
  const search = searchParams.get('q') ?? ''
  const affiliate = getEffectiveAffiliate(session, req)

  const supabase = createAdminClient()

  const memberJoin = affiliate
    ? 'members!member_id!inner ( id, full_name, email, company_name, affiliate )'
    : 'members!member_id ( id, full_name, email, company_name )'

  let query = supabase.from('redemptions')
    .select(`
      id, points_spent, voucher_code, status, created_at,
      delivery_address, prize_content, prize_file_key, shipping_info,
      reward_skus!sku_id ( id, name, image_url, category, is_digital ),
      ${memberJoin}
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (affiliate) query = query.eq('members.affiliate', affiliate)
  if (status !== 'all') {
    if (status === 'active') {
      query = query.in('status', ['active', 'shipped'])
    } else {
      query = query.eq('status', status)
    }
  }
  if (search) query = query.ilike('voucher_code', `%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Error al obtener canjes' }, { status: 500 })

  return NextResponse.json({ redemptions: data ?? [] })
}
