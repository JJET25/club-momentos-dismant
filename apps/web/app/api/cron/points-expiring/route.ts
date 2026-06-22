import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { sendEmail } from '@/lib/resend'
import { sendPushNotification } from '@/lib/firebase-admin'

// Protected by CRON_SECRET env var — set in Vercel cron config
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // allow in dev without secret
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now      = new Date()
  const in30days = new Date(now.getTime() + 30 * 86400000)

  // Find ledger entries expiring in the next 30 days that haven't been notified yet
  const { data: expiring } = await supabase
    .from('ledger_entries')
    .select(`
      id, member_id, points, expires_at,
      members!member_id ( email, full_name, fcm_token )
    `)
    .gt('points', 0)
    .gte('expires_at', now.toISOString())
    .lte('expires_at', in30days.toISOString())

  if (!expiring || expiring.length === 0) {
    return NextResponse.json({ notified: 0, message: 'Sin puntos próximos a vencer' })
  }

  // Group by member
  type MemberPoints = { email: string; name: string; fcmToken: string | null; points: number; expiresAt: string }
  const byMember: Record<string, MemberPoints> = {}

  for (const e of expiring) {
    const member = e.members as unknown as { email: string; full_name: string; fcm_token: string | null } | null
    if (!member) continue
    if (!byMember[e.member_id]) {
      byMember[e.member_id] = { email: member.email, name: member.full_name, fcmToken: member.fcm_token, points: 0, expiresAt: e.expires_at! }
    }
    byMember[e.member_id].points += e.points
    // Keep the soonest expiry
    if (e.expires_at! < byMember[e.member_id].expiresAt) {
      byMember[e.member_id].expiresAt = e.expires_at!
    }
  }

  let notified = 0
  const notificationRows = []

  for (const [memberId, info] of Object.entries(byMember)) {
    const expiryDate = new Date(info.expiresAt).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'long', year: 'numeric',
    })

    try {
      await sendEmail({
        to:      info.email,
        subject: `⚡ Tienes ${info.points.toLocaleString('es-MX')} puntos por vencer`,
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #1e3a8a;">¡No pierdas tus puntos, ${info.name}!</h2>
            <p>Tienes <strong>${info.points.toLocaleString('es-MX')} puntos</strong> que vencen el <strong>${expiryDate}</strong>.</p>
            <p>Canjéalos antes de que expiren en el <a href="${process.env.NEXT_PUBLIC_APP_URL}/catalog" style="color: #2563eb;">catálogo de premios</a>.</p>
          </div>`,
      })
    } catch {
      continue
    }

    const pushTitle = `${info.points.toLocaleString('es-MX')} puntos por vencer`
    const pushBody  = `Vencen el ${expiryDate}. ¡Canjéalos en el catálogo!`

    if (info.fcmToken) {
      sendPushNotification({
        fcmToken: info.fcmToken,
        title:    pushTitle,
        body:     pushBody,
        data:     { type: 'points.expiring', url: '/catalog' },
      }).catch(console.error)
    }

    notificationRows.push({
      member_id: memberId,
      type:      'points.expiring',
      title:     pushTitle,
      body:      `Tus puntos vencen el ${expiryDate}. ¡Canjéalos antes de perderlos!`,
      metadata:  { points: info.points, expires_at: info.expiresAt },
    })
    notified++
  }

  if (notificationRows.length > 0) {
    await supabase.from('notifications').insert(notificationRows)
  }

  return NextResponse.json({ notified, total: Object.keys(byMember).length })
}
