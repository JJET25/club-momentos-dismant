import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const memberId = session.sub
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

  // Últimos 5 movimientos del ledger
  const { data: recentMovements } = await supabase
    .from('ledger_entries')
    .select('id, type, points, balance_after, description, created_at, expires_at')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(5)

  // Saldo actual = balance_after del movimiento más reciente
  const currentBalance = recentMovements?.[0]?.balance_after ?? 0

  // Puntos ganados este mes (solo positivos)
  const { data: monthEntries } = await supabase
    .from('ledger_entries')
    .select('points')
    .eq('member_id', memberId)
    .gte('created_at', startOfMonth)
    .gt('points', 0)

  const pointsThisMonth = monthEntries?.reduce((sum, e) => sum + e.points, 0) ?? 0

  // Puntos canjeados histórico (solo negativos)
  const { data: redeemedEntries } = await supabase
    .from('ledger_entries')
    .select('points')
    .eq('member_id', memberId)
    .eq('type', 'redemption')

  const pointsRedeemed = redeemedEntries?.reduce((sum, e) => sum + Math.abs(e.points), 0) ?? 0

  // Facturas validadas (aprobadas)
  const { count: invoicesApproved } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('member_id', memberId)
    .eq('status', 'approved')

  // Puntos próximos a vencer (en los próximos 30 días)
  const { data: expiringEntries } = await supabase
    .from('ledger_entries')
    .select('points, expires_at')
    .eq('member_id', memberId)
    .gt('points', 0)
    .gte('expires_at', now.toISOString())
    .lte('expires_at', in30Days)

  const expiringPoints = expiringEntries?.reduce((sum, e) => sum + e.points, 0) ?? 0
  const expiringDate = expiringEntries?.[0]?.expires_at ?? null

  return NextResponse.json({
    currentBalance,
    pointsThisMonth,
    pointsRedeemed,
    invoicesApproved: invoicesApproved ?? 0,
    recentMovements: recentMovements ?? [],
    expiring: expiringPoints > 0 ? { points: expiringPoints, date: expiringDate } : null,
  })
}
