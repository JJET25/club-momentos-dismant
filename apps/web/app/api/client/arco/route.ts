import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { sendEmail } from '@/lib/resend'

const ARCO_RIGHTS = ['acceso', 'rectificacion', 'cancelacion', 'oposicion'] as const

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const { right, description, contactEmail } = body

  if (!ARCO_RIGHTS.includes(right)) {
    return NextResponse.json({ error: 'Tipo de derecho no válido' }, { status: 400 })
  }
  if (!description?.trim() || description.trim().length < 20) {
    return NextResponse.json({ error: 'La descripción debe tener al menos 20 caracteres' }, { status: 400 })
  }
  if (!contactEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
    return NextResponse.json({ error: 'Correo de contacto inválido' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: member } = await supabase
    .from('members')
    .select('full_name, email')
    .eq('id', session.sub)
    .single()

  const folio = `ARCO-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
  const rightLabels: Record<string, string> = {
    acceso: 'Acceso', rectificacion: 'Rectificación',
    cancelacion: 'Cancelación', oposicion: 'Oposición',
  }

  // Registrar en audit_log como trazabilidad
  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      'member.arco_request',
    target_type: 'member',
    target_id:   session.sub,
    metadata:    { folio, right, contact_email: contactEmail.trim() },
  })

  // Email de confirmación al miembro
  sendEmail({
    to:      contactEmail.trim(),
    subject: `Solicitud ARCO recibida — Folio ${folio}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1e3a8a;">Solicitud ARCO recibida</h2>
        <p>Hola <strong>${member?.full_name ?? 'Miembro'}</strong>,</p>
        <p>Hemos recibido tu solicitud de derecho de <strong>${rightLabels[right]}</strong>. Nos comunicaremos contigo en un plazo máximo de 20 días hábiles.</p>
        <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Folio:</strong> ${folio}</p>
          <p style="margin: 4px 0;"><strong>Derecho ejercido:</strong> ${rightLabels[right]}</p>
          <p style="margin: 4px 0;"><strong>Correo de contacto:</strong> ${contactEmail.trim()}</p>
        </div>
        <p style="color: #6b7280; font-size: 13px;">Guarda este folio como comprobante de tu solicitud.</p>
      </div>
    `,
  }).catch(console.error)

  // Notificar al equipo (correo de datos personales)
  const adminEmail = process.env.ARCO_ADMIN_EMAIL ?? process.env.RESEND_FROM_EMAIL
  if (adminEmail) {
    sendEmail({
      to:      adminEmail,
      subject: `[ARCO] Nueva solicitud de ${rightLabels[right]} — ${folio}`,
      html: `
        <p><strong>Folio:</strong> ${folio}</p>
        <p><strong>Miembro ID:</strong> ${session.sub}</p>
        <p><strong>Nombre:</strong> ${member?.full_name}</p>
        <p><strong>Email registrado:</strong> ${member?.email}</p>
        <p><strong>Derecho:</strong> ${rightLabels[right]}</p>
        <p><strong>Descripción:</strong> ${description.trim()}</p>
        <p><strong>Correo de contacto:</strong> ${contactEmail.trim()}</p>
      `,
    }).catch(console.error)
  }

  return NextResponse.json({ ok: true, folio })
}
