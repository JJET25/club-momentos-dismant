import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { insertLedgerEntry } from '@/lib/ledger'

const REVIEW_BONUS_POINTS   = 5
const REVIEW_BONUS_MIN_CHARS = 20

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { redemptionId, rating, comment } = await req.json()

  if (!redemptionId) return NextResponse.json({ error: 'redemptionId requerido' }, { status: 400 })
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'La calificación debe ser entre 1 y 5' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verificar que el canje pertenece al miembro y existe
  const { data: redemption } = await supabase
    .from('redemptions')
    .select('id, member_id, sku_id, reward_skus!sku_id(name)')
    .eq('id', redemptionId)
    .eq('member_id', session.sub)
    .maybeSingle()

  if (!redemption) {
    return NextResponse.json({ error: 'Canje no encontrado' }, { status: 404 })
  }

  // Verificar que no haya ya una reseña para este canje
  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('redemption_id', redemptionId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Este canje ya fue calificado' }, { status: 409 })
  }

  const commentTrimmed = comment?.trim() ?? ''
  const awardBonus = commentTrimmed.length >= REVIEW_BONUS_MIN_CHARS

  const { error } = await supabase.from('reviews').insert({
    id:            crypto.randomUUID(),
    member_id:     session.sub,
    redemption_id: redemptionId,
    sku_id:        redemption.sku_id,
    rating,
    comment:       commentTrimmed || null,
    bonus_awarded: awardBonus,
  })

  if (error) return NextResponse.json({ error: 'Error al guardar la reseña' }, { status: 500 })

  const skuName = (redemption.reward_skus as unknown as { name: string } | null)?.name ?? 'Premio'

  if (awardBonus) {
    await insertLedgerEntry({
      memberId:    session.sub,
      type:        'review_bonus',
      points:      REVIEW_BONUS_POINTS,
      description: `Bono por reseña: ${skuName}`,
    })
  }

  return NextResponse.json({ ok: true, bonus_awarded: awardBonus, bonus_points: awardBonus ? REVIEW_BONUS_POINTS : 0 })
}
