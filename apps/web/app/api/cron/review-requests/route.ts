import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { sendEmail } from '@/lib/resend'
import { sendPushNotification } from '@/lib/firebase-admin'

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now      = new Date()
  const from24h  = new Date(now.getTime() - 25 * 3600000) // 24-25h window
  const to24h    = new Date(now.getTime() - 24 * 3600000)

  // Redemptions made 24h ago that don't already have a review
  const { data: redemptions } = await supabase
    .from('redemptions')
    .select(`
      id, member_id, created_at,
      reward_skus!sku_id ( name ),
      members!member_id ( email, full_name, fcm_token ),
      reviews!redemption_id ( id )
    `)
    .gte('created_at', from24h.toISOString())
    .lte('created_at', to24h.toISOString())

  if (!redemptions || redemptions.length === 0) {
    return NextResponse.json({ sent: 0, message: 'Sin canjes para solicitar reseña' })
  }

  let sent = 0
  const notificationRows = []

  for (const r of redemptions) {
    const reviews = r.reviews as unknown as { id: string }[] | null
    if (reviews && reviews.length > 0) continue // already reviewed

    const member = r.members as unknown as { email: string; full_name: string; fcm_token: string | null } | null
    const sku    = r.reward_skus as unknown as { name: string } | null
    if (!member || !sku) continue

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

    try {
      await sendEmail({
        to:      member.email,
        subject: `⭐ ¿Cómo fue tu experiencia con ${sku.name}? ¡Gana 5 puntos!`,
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #1e3a8a;">Hola, ${member.full_name}</h2>
            <p>¿Qué tal estuvo tu canje de <strong>${sku.name}</strong>?</p>
            <p>Califica tu experiencia y <strong>gana 5 puntos adicionales</strong> si dejas un comentario de al menos 20 caracteres.</p>
            <a href="${appUrl}/redemptions" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #2563eb; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Calificar ahora
            </a>
          </div>`,
      })
    } catch {
      continue
    }

    if (member.fcm_token) {
      sendPushNotification({
        fcmToken: member.fcm_token,
        title:    `¿Cómo fue tu canje de ${sku.name}?`,
        body:     '¡Gana 5 puntos adicionales por dejar una reseña!',
        data:     { type: 'redemption.review_request', url: '/redemptions' },
      }).catch(console.error)
    }

    notificationRows.push({
      member_id: r.member_id,
      type:      'redemption.review_request',
      title:     `Califica tu canje de ${sku.name}`,
      body:      '¡Gana 5 puntos adicionales por dejar una reseña!',
      metadata:  { redemption_id: r.id, sku_name: sku.name },
    })
    sent++
  }

  if (notificationRows.length > 0) {
    await supabase.from('notifications').insert(notificationRows)
  }

  return NextResponse.json({ sent, total: redemptions.length })
}
