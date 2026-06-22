import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? ''
  const from = searchParams.get('from') ?? ''
  const to   = searchParams.get('to')   ?? ''

  const supabase  = createAdminClient()
  const memberId  = session.sub
  const now       = new Date()
  const in30Days  = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

  // Stats globales + movimientos filtrados en paralelo
  const [allRes, filteredRes, expiringRes] = await Promise.all([
    // Todos los movimientos para calcular stats globales
    supabase
      .from('ledger_entries')
      .select('points, type, created_at, expires_at, balance_after')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(1000),

    // Movimientos filtrados para la tabla
    (() => {
      let q = supabase
        .from('ledger_entries')
        .select(`
          id, type, points, balance_after, description, created_at, expires_at,
          invoices!invoice_id (
            uuid_cfdi, total_mxn, issued_at, rfc_emisor, status, approved_at, approved_by
          )
        `)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(200)

      if (type) q = q.eq('type', type)
      if (from) q = q.gte('created_at', from)
      if (to)   q = q.lte('created_at', to + 'T23:59:59')

      return q
    })(),

    // Puntos por vencer en 30 días
    supabase
      .from('ledger_entries')
      .select('points, expires_at')
      .eq('member_id', memberId)
      .gt('points', 0)
      .gte('expires_at', now.toISOString())
      .lte('expires_at', in30Days),
  ])

  if (filteredRes.error) {
    console.error('[statement] Error:', filteredRes.error)
    return NextResponse.json({ error: 'Error al obtener el estado de cuenta' }, { status: 500 })
  }

  const allEntries      = allRes.data ?? []
  const filteredEntries = filteredRes.data ?? []

  // Saldo actual = balance_after del movimiento más reciente
  const balance = allEntries[0]?.balance_after ?? 0

  // Estadísticas globales
  const totalEarned   = allEntries.filter(e => e.points > 0).reduce((s, e) => s + e.points, 0)
  const totalRedeemed = allEntries.filter(e => e.type === 'redemption').reduce((s, e) => s + Math.abs(e.points), 0)
  const totalInvoices = allEntries.filter(e => e.type === 'invoice').length

  // Puntos por vencer
  const expiringPoints = (expiringRes.data ?? []).reduce((s, e) => s + e.points, 0)
  const expiringDate   = expiringRes.data?.[0]?.expires_at ?? null

  // Actividad mensual: últimos 6 meses
  const monthlyMap: Record<string, { earned: number; redeemed: number }> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyMap[key] = { earned: 0, redeemed: 0 }
  }
  for (const e of allEntries) {
    const key = e.created_at.slice(0, 7)
    if (!monthlyMap[key]) continue
    if (e.points > 0) monthlyMap[key].earned   += e.points
    else              monthlyMap[key].redeemed  += Math.abs(e.points)
  }
  const byMonth = Object.entries(monthlyMap).map(([month, v]) => ({
    month,
    label: new Date(month + '-01').toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
    earned:   v.earned,
    redeemed: v.redeemed,
  }))

  return NextResponse.json({
    balance,
    entries: filteredEntries,
    summary: {
      totalEarned,
      totalRedeemed,
      totalInvoices,
      expiringPoints,
      expiringDate,
    },
    byMonth,
  })
}
