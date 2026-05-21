import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

function generateVoucherCode(): string {
  // 8 chars alfanumérico sin caracteres ambiguos (0/O, 1/I/L)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(
    { length: 8 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { sku_id } = await req.json()
  if (!sku_id) {
    return NextResponse.json({ error: 'Falta el premio a canjear' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const memberId = session.sub

  // 1. Leer SKU y saldo actual en paralelo
  const [skuRes, ledgerRes] = await Promise.all([
    supabase
      .from('reward_skus')
      .select('id, name, points_cost, stock, status')
      .eq('id', sku_id)
      .single(),
    supabase
      .from('ledger_entries')
      .select('balance_after')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const sku     = skuRes.data
  const balance = ledgerRes.data?.balance_after ?? 0

  if (!sku || sku.status !== 'active') {
    return NextResponse.json({ error: 'Premio no disponible' }, { status: 404 })
  }

  if (sku.stock <= 0) {
    return NextResponse.json({
      error: 'Lo sentimos, este premio se agotó. Tu saldo no fue afectado.',
    }, { status: 409 })
  }

  if (balance < sku.points_cost) {
    return NextResponse.json({
      error: `Saldo insuficiente. Necesitas ${(sku.points_cost - balance).toLocaleString('es-MX')} puntos más.`,
    }, { status: 422 })
  }

  // 2. Decremento atómico con optimistic lock (si el stock cambió entre leer y actualizar → falla)
  const { data: decremented } = await supabase
    .from('reward_skus')
    .update({ stock: sku.stock - 1 })
    .eq('id', sku_id)
    .eq('stock', sku.stock)   // optimistic lock: solo actualiza si el stock no cambió
    .gt('stock', 0)
    .select('id')
    .maybeSingle()

  if (!decremented) {
    return NextResponse.json({
      error: 'Lo sentimos, este premio se agotó. Tu saldo no fue afectado.',
    }, { status: 409 })
  }

  // 3. Crear registros (redemption + ledger + audit)
  const redemptionId  = crypto.randomUUID()
  const voucherCode   = generateVoucherCode()
  const balanceAfter  = balance - sku.points_cost
  const ledgerEntryId = crypto.randomUUID()

  const { data: redemption, error: redemptionError } = await supabase
    .from('redemptions')
    .insert({
      id:           redemptionId,
      member_id:    memberId,
      sku_id:       sku_id,
      points_spent: sku.points_cost,
      voucher_code: voucherCode,
      status:       'active',
    })
    .select('id, voucher_code, points_spent, created_at')
    .single()

  if (redemptionError || !redemption) {
    // Revertir el decremento de stock
    await supabase
      .from('reward_skus')
      .update({ stock: sku.stock })
      .eq('id', sku_id)
    return NextResponse.json({ error: 'Error al procesar el canje. Intenta de nuevo.' }, { status: 500 })
  }

  // 4. Ledger entry negativa
  await supabase.from('ledger_entries').insert({
    id:            ledgerEntryId,
    member_id:     memberId,
    type:          'redemption',
    points:        -sku.points_cost,
    balance_after: balanceAfter,
    description:   `Canje: ${sku.name}`,
    redemption_id: redemptionId,
  })

  // 5. Audit log
  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    memberId,
    action:      'redemption.created',
    target_type: 'redemption',
    target_id:   redemptionId,
    metadata:    { sku_id, sku_name: sku.name, points_spent: sku.points_cost, balance_after: balanceAfter },
  })

  return NextResponse.json({
    redemption: {
      id:           redemption.id,
      voucher_code: redemption.voucher_code,
      points_spent: redemption.points_spent,
      balance_after: balanceAfter,
      sku_name:     sku.name,
      created_at:   redemption.created_at,
    },
  }, { status: 201 })
}

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('redemptions')
    .select(`
      id, points_spent, voucher_code, status, created_at,
      reward_skus!sku_id ( id, name, image_url, category, is_digital )
    `)
    .eq('member_id', session.sub)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: 'Error al obtener canjes' }, { status: 500 })
  }

  return NextResponse.json({ redemptions: data ?? [] })
}
