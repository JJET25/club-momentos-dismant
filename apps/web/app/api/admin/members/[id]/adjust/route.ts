import { MANAGER_ROLES } from '@/lib/permissions'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'Solo administradores pueden ajustar puntos' }, { status: 403 })
  }

  const { id: memberId } = await params
  const { points, reason } = await req.json()

  if (!points || typeof points !== 'number' || points === 0) {
    return NextResponse.json({ error: 'La cantidad de puntos es requerida' }, { status: 400 })
  }
  if (!reason?.trim()) {
    return NextResponse.json({ error: 'La razón del ajuste es obligatoria' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verificar que el miembro existe
  const { data: member } = await supabase
    .from('members').select('id').eq('id', memberId).single()
  if (!member) {
    return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })
  }

  // Saldo actual
  const { data: latest } = await supabase
    .from('ledger_entries')
    .select('balance_after')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const currentBalance = latest?.balance_after ?? 0
  const newBalance = currentBalance + points

  if (newBalance < 0) {
    return NextResponse.json({ error: 'El ajuste dejaría el saldo en negativo' }, { status: 422 })
  }

  const { error } = await supabase.from('ledger_entries').insert({
    id:            crypto.randomUUID(),
    member_id:     memberId,
    type:          'adjustment',
    points,
    balance_after: newBalance,
    description:   reason.trim(),
    operator_id:   session.sub,
  })

  if (error) {
    return NextResponse.json({ error: 'Error al registrar el ajuste' }, { status: 500 })
  }

  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      'ledger.manual_adjustment',
    target_type: 'member',
    target_id:   memberId,
    metadata:    { points, reason, balance_before: currentBalance, balance_after: newBalance },
  })

  return NextResponse.json({ balance_after: newBalance })
}
