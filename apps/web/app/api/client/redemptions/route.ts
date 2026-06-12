import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { sendEmail, buildVoucherEmail } from '@/lib/resend'

function generateVoucherCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const { sku_id, delivery_address } = body
  if (!sku_id) {
    return NextResponse.json({ error: 'Falta el premio a canjear' }, { status: 400 })
  }

  const supabase  = createAdminClient()
  const memberId  = session.sub

  // 1. Leer SKU y saldo actual en paralelo
  const [skuRes, ledgerRes] = await Promise.all([
    supabase.from('reward_skus')
      .select('id, name, points_cost, stock, status, is_digital')
      .eq('id', sku_id).single(),
    supabase.from('ledger_entries')
      .select('balance_after').eq('member_id', memberId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const sku     = skuRes.data
  const balance = ledgerRes.data?.balance_after ?? 0

  if (!sku || sku.status !== 'active') {
    return NextResponse.json({ error: 'Premio no disponible' }, { status: 404 })
  }
  if (!sku.is_digital && !delivery_address) {
    return NextResponse.json({ error: 'Se requiere dirección de entrega para premios físicos' }, { status: 400 })
  }
  if (sku.stock <= 0) {
    return NextResponse.json({ error: 'Lo sentimos, este premio se agotó. Tu saldo no fue afectado.' }, { status: 409 })
  }
  if (balance < sku.points_cost) {
    return NextResponse.json({
      error: `Saldo insuficiente. Necesitas ${(sku.points_cost - balance).toLocaleString('es-MX')} puntos más.`,
    }, { status: 422 })
  }

  // 2. Decremento atómico con optimistic lock
  const { data: decremented } = await supabase.from('reward_skus')
    .update({ stock: sku.stock - 1 })
    .eq('id', sku_id).eq('stock', sku.stock).gt('stock', 0)
    .select('id').maybeSingle()

  if (!decremented) {
    return NextResponse.json({ error: 'Lo sentimos, este premio se agotó. Tu saldo no fue afectado.' }, { status: 409 })
  }

  // 3. Para premios digitales: tomar un código del pool
  let digitalCodeRecord: { id: string; code: string } | null = null
  if (sku.is_digital) {
    const { data: codeRow } = await supabase.from('digital_codes')
      .select('id, code').eq('sku_id', sku_id).is('assigned_to', null)
      .order('created_at', { ascending: true }).limit(1).maybeSingle()
    digitalCodeRecord = codeRow ?? null
  }

  // 4. Crear registros
  const redemptionId  = crypto.randomUUID()
  const voucherCode   = generateVoucherCode()
  const balanceAfter  = balance - sku.points_cost
  const ledgerEntryId = crypto.randomUUID()

  const { data: redemption, error: redemptionError } = await supabase.from('redemptions')
    .insert({
      id:               redemptionId,
      member_id:        memberId,
      sku_id,
      points_spent:     sku.points_cost,
      voucher_code:     voucherCode,
      status:           'active',
      delivery_address: delivery_address ?? null,
    })
    .select('id, voucher_code, points_spent, created_at').single()

  if (redemptionError || !redemption) {
    // Rollback: releer stock actual para evitar usar valor obsoleto
    const { data: currentSku } = await supabase.from('reward_skus').select('stock').eq('id', sku_id).single()
    if (currentSku) {
      await supabase.from('reward_skus').update({ stock: currentSku.stock + 1 }).eq('id', sku_id)
    }
    return NextResponse.json({ error: 'Error al procesar el canje. Intenta de nuevo.' }, { status: 500 })
  }

  // 5. Asignar código digital al redemption
  if (digitalCodeRecord) {
    await supabase.from('digital_codes')
      .update({ assigned_to: redemptionId, assigned_at: new Date().toISOString() })
      .eq('id', digitalCodeRecord.id)
  }

  // 6. Ledger entry negativa
  await supabase.from('ledger_entries').insert({
    id:            ledgerEntryId,
    member_id:     memberId,
    type:          'redemption',
    points:        -sku.points_cost,
    balance_after: balanceAfter,
    description:   `Canje: ${sku.name}`,
    redemption_id: redemptionId,
  })

  // 7. Audit log
  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    memberId,
    action:      'redemption.created',
    target_type: 'redemption',
    target_id:   redemptionId,
    metadata:    { sku_id, sku_name: sku.name, points_spent: sku.points_cost, balance_after: balanceAfter },
  })

  // 8. Email de confirmación (no bloqueante)
  sendEmail({
    to:      session.email,
    subject: `¡Canje exitoso! ${sku.name}`,
    html:    buildVoucherEmail({
      userName:    session.name,
      skuName:     sku.name,
      voucherCode,
      pointsSpent: sku.points_cost,
      newBalance:  balanceAfter,
      isDigital:   sku.is_digital ?? false,
      digitalCode: digitalCodeRecord?.code,
    }),
  }).catch(err => console.error('[redemption] Error sending email:', err))

  return NextResponse.json({
    redemption: {
      id:           redemption.id,
      voucher_code: redemption.voucher_code,
      points_spent: redemption.points_spent,
      balance_after: balanceAfter,
      sku_name:     sku.name,
      created_at:   redemption.created_at,
      is_digital:   sku.is_digital ?? false,
      digital_code: digitalCodeRecord?.code ?? null,
    },
  }, { status: 201 })
}

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('redemptions')
    .select(`
      id, points_spent, voucher_code, status, created_at,
      delivery_address, prize_content, prize_file_key, shipping_info,
      reward_skus!sku_id ( id, name, image_url, category, is_digital ),
      reviews!redemption_id ( id )
    `)
    .eq('member_id', session.sub)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: 'Error al obtener canjes' }, { status: 500 })

  const redemptions = (data ?? []).map(r => ({
    ...r,
    has_review: Array.isArray(r.reviews) ? r.reviews.length > 0 : !!r.reviews,
  }))

  return NextResponse.json({ redemptions })
}
