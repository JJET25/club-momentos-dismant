import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

const FROM = process.env.RESEND_FROM_EMAIL!
const FROM_NAME = process.env.RESEND_FROM_NAME ?? 'Club Momentos Dismant'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

/** Envía un email transaccional via Resend */
export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const { data, error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM}>`,
    to,
    subject,
    html,
    text,
  })

  if (error) {
    console.error('[Resend] Error al enviar email:', error)
    throw new Error(`Email send failed: ${error.message}`)
  }

  return data
}

// ── Plantillas de email ──────────────────────────────────────

/** OTP de acceso al sistema */
export function buildOTPEmail(code: string, userName?: string): string {
  return `
    <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
      <img src="${process.env.NEXT_PUBLIC_APP_URL}/logo.png" alt="Club Momentos Dismant" height="40" />
      <h2 style="margin-top: 24px; color: #1e3a8a;">Tu código de acceso</h2>
      ${userName ? `<p>Hola ${userName},</p>` : ''}
      <p>Usa este código para ingresar a tu cuenta. Expira en <strong>10 minutos</strong>.</p>
      <div style="background: #eff6ff; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
        <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #2563eb;">
          ${code}
        </span>
      </div>
      <p style="color: #6b7280; font-size: 14px;">
        Si no solicitaste este código, ignora este mensaje. Tu cuenta permanece segura.
      </p>
    </div>
  `
}

/** Notificación de factura aprobada */
export function buildInvoiceApprovedEmail(params: {
  userName: string
  uuidCfdi: string
  points: number
  newBalance: number
}): string {
  return `
    <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #16a34a;">✅ Factura validada exitosamente</h2>
      <p>Hola ${params.userName},</p>
      <p>Tu factura fue validada y se acreditaron puntos a tu cuenta.</p>
      <div style="background: #dcfce7; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Folio Fiscal:</strong> ${params.uuidCfdi.slice(0, 8)}...</p>
        <p style="margin: 4px 0;"><strong>Puntos acreditados:</strong> +${params.points} pts</p>
        <p style="margin: 4px 0;"><strong>Nuevo saldo:</strong> ${params.newBalance} pts</p>
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/catalog"
         style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
        Ver catálogo de premios
      </a>
    </div>
  `
}

/** Notificación de factura rechazada */
export function buildInvoiceRejectedEmail(params: {
  userName: string
  uuidCfdi: string
  reason: string
}): string {
  return `
    <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #dc2626;">❌ Factura no procesada</h2>
      <p>Hola ${params.userName},</p>
      <p>Tu factura no pudo ser procesada por la siguiente razón:</p>
      <div style="background: #fee2e2; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Folio:</strong> ${params.uuidCfdi.slice(0, 8)}...</p>
        <p style="margin: 4px 0;"><strong>Razón:</strong> ${params.reason}</p>
      </div>
      <p>Si tienes dudas, contacta a tu ejecutivo de cuenta en Dismant.</p>
    </div>
  `
}

/** Alerta de puntos por vencer */
export function buildPointsExpiringEmail(params: {
  userName: string
  points: number
  expiresAt: string
}): string {
  return `
    <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #d97706;">⚠️ Tienes puntos que están por vencer</h2>
      <p>Hola ${params.userName},</p>
      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>${params.points} puntos</strong> vencen el <strong>${params.expiresAt}</strong></p>
      </div>
      <p>Visita el catálogo y canjéalos antes de perderlos.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/catalog"
         style="display: inline-block; background: #d97706; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
        Ver premios disponibles
      </a>
    </div>
  `
}
