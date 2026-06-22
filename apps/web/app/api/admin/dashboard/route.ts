import { STAFF_ROLES } from '@/lib/permissions'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session || !STAFF_ROLES.includes(session.role as never)) {
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
    approvedInvoicesRes,
    pendingRedemptionsRes,
    topRewardsRes,
    recentInvoicesRes,
    recentRedemptionsRes,
    recentMembersRes,
  ] = await Promise.all([
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('members').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth),
    supabase.from('ledger_entries').select('points, type'),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('invoices').select('id, total_amount').eq('status', 'approved').gte('created_at', startOfMonth),
    supabase.from('redemptions').select('id', { count: 'exact', head: true }).in('status', ['pending', 'processing']),
    supabase.from('redemptions').select('reward_skus!sku_id(name)').gte('created_at', startOfMonth),
    supabase.from('invoices')
      .select('id, status, total_amount, created_at, members!member_id(company_name, rfc)')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('redemptions')
      .select('id, status, points_used, created_at, members!member_id(company_name), reward_skus!sku_id(name)')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('members')
      .select('id, company_name, email, created_at, status')
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  const entries = ledgerRes.data ?? []
  const pointsInCirculation = entries.reduce((acc, e) => acc + e.points, 0)
  const pointsRedeemed = entries
    .filter(e => e.type === 'redemption')
    .reduce((acc, e) => acc + Math.abs(e.points), 0)

  const totalAmountThisMonth = (approvedInvoicesRes.data ?? [])
    .reduce((acc, inv) => acc + (inv.total_amount ?? 0), 0)

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

  const recentInvoices = (recentInvoicesRes.data ?? []).map(inv => {
    const m = (inv.members as unknown) as { company_name: string; rfc: string } | null
    return {
      id:           inv.id,
      status:       inv.status,
      total_amount: inv.total_amount ?? 0,
      created_at:   inv.created_at,
      company:      m?.company_name ?? m?.rfc ?? '—',
    }
  })

  const recentRedemptions = (recentRedemptionsRes.data ?? []).map(red => {
    const m   = (red.members as unknown) as { company_name: string } | null
    const sku = (red.reward_skus as unknown) as { name: string } | null
    return {
      id:          red.id,
      status:      red.status,
      points_used: red.points_used ?? 0,
      created_at:  red.created_at,
      company:     m?.company_name ?? '—',
      reward:      sku?.name ?? '—',
    }
  })

  const recentMembers = (recentMembersRes.data ?? []).map(m => ({
    id:           m.id,
    company_name: m.company_name,
    email:        m.email,
    created_at:   m.created_at,
    status:       m.status,
  }))

  return NextResponse.json({
    totalMembers:          membersRes.count ?? 0,
    newMembersThisMonth:   newMembersRes.count ?? 0,
    pointsInCirculation,
    pointsRedeemed,
    pendingInvoices:       pendingInvoicesRes.count ?? 0,
    pendingRedemptions:    pendingRedemptionsRes.count ?? 0,
    totalAmountThisMonth,
    topRewards,
    recentInvoices,
    recentRedemptions,
    recentMembers,
  })
}
