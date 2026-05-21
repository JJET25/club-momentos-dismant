import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

const ADMIN_ROLES = ['owner', 'admin', 'employee']

export async function GET() {
  const session = await getSession()
  if (!session || !ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    membersRes,
    newMembersRes,
    ledgerRes,
    pendingInvoicesRes,
    topRewardsRes,
  ] = await Promise.all([
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('members').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth),
    supabase.from('ledger_entries').select('points, type'),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase
      .from('redemptions')
      .select('reward_skus!sku_id(name)')
      .gte('created_at', startOfMonth),
  ])

  // Puntos en circulación = positivos - abs(negativos)
  const entries = ledgerRes.data ?? []
  const pointsInCirculation = entries.reduce((acc, e) => acc + e.points, 0)
  const pointsRedeemed = entries
    .filter(e => e.type === 'redemption')
    .reduce((acc, e) => acc + Math.abs(e.points), 0)

  // Top 5 premios del mes
  const skuCounts: Record<string, { name: string; count: number }> = {}
  for (const r of topRewardsRes.data ?? []) {
    const sku = (r.reward_skus as unknown) as { name: string } | null
    if (!sku) continue
    if (!skuCounts[sku.name]) skuCounts[sku.name] = { name: sku.name, count: 0 }
    skuCounts[sku.name].count++
  }
  const topRewards = Object.values(skuCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return NextResponse.json({
    totalMembers:      membersRes.count ?? 0,
    newMembersThisMonth: newMembersRes.count ?? 0,
    pointsInCirculation,
    pointsRedeemed,
    pendingInvoices:   pendingInvoicesRes.count ?? 0,
    topRewards,
  })
}
