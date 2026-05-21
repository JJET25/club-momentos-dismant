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
  userName:   string
  uuidCfdi:   string
  totalMxn:   number
  points:     number
  newBalance: number
}): string {
  const fmtMxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(params.totalMxn)
  const fmtPts = (n: number) => n.toLocaleString('es-MX')
  return `
    <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 28px;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: #16a34a; border-radius: 16px;">
          <span style="font-size: 30px;">✅</span>
        </div>
        <h1 style="margin-top: 12px; font-size: 20px; color: #1e3a8a; margin-bottom: 0;">Club Momentos Dismant</h1>
      </div>

      <h2 style="color: #15803d; margin-bottom: 8px;">Factura validada exitosamente</h2>
      <p style="color: #374151;">Hola <strong>${params.userName}</strong>,</p>
      <p style="color: #374151; line-height: 1.6;">
        Tu factura fue revisada y aprobada. Los puntos ya están disponibles en tu cuenta.
      </p>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 20px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Folio Fiscal</td>
            <td style="padding: 6px 0; text-align: right; font-family: monospace; font-size: 13px; color: #111827;">${params.uuidCfdi}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px; border-top: 1px solid #dcfce7;">Monto de la factura</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #111827; border-top: 1px solid #dcfce7;">${fmtMxn}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px; border-top: 1px solid #dcfce7;">Puntos acreditados</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #16a34a; font-size: 18px; border-top: 1px solid #dcfce7;">+${fmtPts(params.points)} pts</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px; border-top: 1px solid #dcfce7;">Saldo total</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #2563eb; font-size: 18px; border-top: 1px solid #dcfce7;">${fmtPts(params.newBalance)} pts</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/catalog"
           style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">
          Ver premios disponibles →
        </a>
      </div>

      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        Club Momentos Dismant · Si tienes dudas, contacta a tu ejecutivo de cuenta.
      </p>
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

/** Email de invitación al club */
export function buildInvitationEmail(params: {
  inviteLink: string
  recipientName?: string
  senderName?: string
}): string {
  return `
    <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: #2563eb; border-radius: 16px;">
          <span style="font-size: 28px; font-weight: 700; color: white;">D</span>
        </div>
        <h1 style="margin-top: 12px; font-size: 20px; color: #1e3a8a; margin-bottom: 0;">Club Momentos Dismant</h1>
      </div>

      <h2 style="color: #111827; margin-bottom: 8px;">
        ${params.recipientName ? `Hola ${params.recipientName},` : 'Hola,'}
      </h2>
      <p style="color: #374151; line-height: 1.6;">
        ${params.senderName ? `<strong>${params.senderName}</strong> te ha invitado a` : 'Has sido invitado a'} unirte al
        <strong>Club Momentos Dismant</strong>, el programa de lealtad exclusivo para clientes de Dismant.
      </p>
      <p style="color: #374151; line-height: 1.6;">
        Acumula puntos con cada compra y canjéalos por premios exclusivos en tu zona.
      </p>

      <div style="text-align: center; margin: 36px 0;">
        <a href="${params.inviteLink}"
           style="display: inline-block; background: #2563eb; color: white; padding: 16px 40px;
                  border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Crear mi cuenta
        </a>
      </div>

      <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 13px; color: #64748b;">
          Este enlace es personal e intransferible. Expira en <strong>7 días</strong> y solo puede usarse una vez.
        </p>
      </div>

      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        Si no esperabas esta invitación, puedes ignorar este mensaje.
      </p>
    </div>
  `
}

/** Magic Link de acceso */
export function buildMagicLinkEmail(magicLink: string, userName?: string): string {
  return `
    <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: #2563eb; border-radius: 16px;">
          <span style="font-size: 28px; font-weight: 700; color: white;">D</span>
        </div>
        <h1 style="margin-top: 12px; font-size: 20px; color: #1e3a8a;">Club Momentos Dismant</h1>
      </div>
      <h2 style="color: #111827;">Tu enlace de acceso</h2>
      ${userName ? `<p>Hola ${userName},</p>` : ''}
      <p>Haz clic en el botón para ingresar a tu cuenta. Este enlace expira en <strong>15 minutos</strong> y solo puede usarse una vez.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${magicLink}"
           style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Ingresar a mi cuenta
        </a>
      </div>
      <p style="color: #6b7280; font-size: 13px; text-align: center;">
        Si no solicitaste este enlace, ignora este mensaje. Tu cuenta permanece segura.
      </p>
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
