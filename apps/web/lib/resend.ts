import { Resend } from 'resend'

// Lazy-init: evita throw en build de Next.js cuando la API key no está presente
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend
}

const FROM_NAME = process.env.RESEND_FROM_NAME ?? 'Club Momentos Dismant'

interface Attachment {
  filename: string
  content: string  // base64
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: Attachment[]
}

/** Envía un email transaccional via Resend */
export async function sendEmail({ to, subject, html, text, attachments }: SendEmailOptions) {
  const from = process.env.RESEND_FROM_EMAIL!
  const { data, error } = await getResend().emails.send({
    from: `${FROM_NAME} <${from}>`,
    to,
    subject,
    html,
    text,
    ...(attachments?.length ? { attachments } : {}),
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

// ── Config por afiliado ──────────────────────────────────────

const AFFILIATE_CONFIG: Record<string, { clubName: string; brand: string; color: string; colorDark: string; initial: string }> = {
  dismant: {
    clubName:  'Club Momentos Dismant',
    brand:     'Dismant',
    color:     '#2563eb',
    colorDark: '#1e3a8a',
    initial:   'D',
  },
  lauti: {
    clubName:  'Club Momentos Lauti',
    brand:     'Lauti',
    color:     '#d97706',
    colorDark: '#92400e',
    initial:   'L',
  },
}

/** Email de invitación al club */
export function buildInvitationEmail(params: {
  inviteLink: string
  recipientName?: string
  senderName?: string
  affiliate?: string
}): string {
  const cfg = AFFILIATE_CONFIG[params.affiliate ?? 'dismant'] ?? AFFILIATE_CONFIG.dismant

  return `
    <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: ${cfg.color}; border-radius: 16px;">
          <span style="font-size: 28px; font-weight: 700; color: white;">${cfg.initial}</span>
        </div>
        <h1 style="margin-top: 12px; font-size: 20px; color: ${cfg.colorDark}; margin-bottom: 0;">${cfg.clubName}</h1>
      </div>

      <h2 style="color: #111827; margin-bottom: 8px;">
        ${params.recipientName ? `Hola ${params.recipientName},` : 'Hola,'}
      </h2>
      <p style="color: #374151; line-height: 1.6;">
        ${params.senderName ? `<strong>${params.senderName}</strong> te ha invitado a` : 'Has sido invitado a'} unirte al
        <strong>${cfg.clubName}</strong>, el programa de lealtad exclusivo para clientes de ${cfg.brand}.
      </p>
      <p style="color: #374151; line-height: 1.6;">
        Acumula puntos con cada compra y canjéalos por premios exclusivos en tu zona.
      </p>

      <div style="text-align: center; margin: 36px 0;">
        <a href="${params.inviteLink}"
           style="display: inline-block; background: ${cfg.color}; color: white; padding: 16px 40px;
                  border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Crear mi cuenta
        </a>
      </div>

      <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">
          Este enlace es personal e intransferible. Expira en <strong>7 días</strong> y solo puede usarse una vez.
        </p>
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
          Si el botón no funciona, copia y pega este enlace en tu navegador:
        </p>
        <p style="margin: 6px 0 0; font-size: 11px; word-break: break-all;">
          <a href="${params.inviteLink}" style="color: ${cfg.color};">${params.inviteLink}</a>
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

/** Confirmación de canje + voucher */
export function buildVoucherEmail(params: {
  userName:    string
  skuName:     string
  voucherCode: string
  pointsSpent: number
  newBalance:  number
  isDigital:   boolean
  digitalCode?: string
}): string {
  const fmtPts = (n: number) => n.toLocaleString('es-MX')
  const instructionHtml = params.isDigital && params.digitalCode
    ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px;margin:20px 0;text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Tu código digital</p>
        <p style="margin:0;font-size:28px;font-family:monospace;font-weight:700;letter-spacing:6px;color:#1d4ed8;">${params.digitalCode}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">Úsalo en la plataforma del socio correspondiente</p>
       </div>`
    : `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 6px;font-size:13px;color:#374151;font-weight:600;">¿Cómo recibir tu premio?</p>
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;">Presenta el código de referencia a tu ejecutivo de Dismant.
        Él gestionará la entrega de tu premio.</p>
       </div>`

  return `
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#fff;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;background:#16a34a;border-radius:50%;">
          <span style="font-size:30px;">✅</span>
        </div>
        <h1 style="margin-top:12px;font-size:20px;color:#1e3a8a;margin-bottom:0;">¡Canje exitoso!</h1>
      </div>

      <p style="color:#374151;">Hola <strong>${params.userName}</strong>,</p>
      <p style="color:#374151;line-height:1.6;">
        Tu canje de <strong>${params.skuName}</strong> fue procesado exitosamente.
      </p>

      <div style="background:#f8fafc;border-radius:10px;padding:16px;margin:20px 0;text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Código de referencia</p>
        <p style="margin:0;font-size:28px;font-family:monospace;font-weight:700;letter-spacing:6px;color:#111827;">${params.voucherCode}</p>
      </div>

      ${instructionHtml}

      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb;">Puntos canjeados</td>
          <td style="padding:8px 0;text-align:right;font-weight:600;color:#ef4444;border-top:1px solid #e5e7eb;">-${fmtPts(params.pointsSpent)} pts</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb;">Saldo restante</td>
          <td style="padding:8px 0;text-align:right;font-weight:700;color:#2563eb;font-size:16px;border-top:1px solid #e5e7eb;">${fmtPts(params.newBalance)} pts</td>
        </tr>
      </table>

      <div style="text-align:center;margin:28px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/redemptions"
           style="display:inline-block;background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Ver mis canjes →
        </a>
      </div>

      <p style="color:#9ca3af;font-size:12px;text-align:center;">
        Club Momentos Dismant · Guarda este correo como comprobante de tu canje.
      </p>
    </div>
  `
}

/** Premio entregado por el admin — digital (con código y/o archivo adjunto) */
export function buildPrizeDeliveredEmail(params: {
  userName:      string
  skuName:       string
  prizeContent?: string
  hasFile?:      boolean
  fileName?:     string
  isDigital:     boolean
  voucherCode:   string
}): string {
  const codeBlock = params.prizeContent
    ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
        <p style="margin:0 0 8px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Tu código / acceso</p>
        <p style="margin:0;font-size:26px;font-family:monospace;font-weight:700;letter-spacing:4px;color:#1d4ed8;">${params.prizeContent}</p>
        <p style="margin:10px 0 0;font-size:12px;color:#6b7280;">Guarda este código — es tu acceso al premio.</p>
       </div>`
    : ''

  const fileBlock = params.hasFile
    ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:16px 0;display:flex;align-items:center;gap:12px;">
        <span style="font-size:24px;">📎</span>
        <div>
          <p style="margin:0;font-size:13px;font-weight:600;color:#166534;">${params.fileName ?? 'Archivo adjunto'}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Tu boleto o archivo está adjunto a este correo.</p>
        </div>
       </div>`
    : ''

  const fallback = !params.prizeContent && !params.hasFile
    ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:24px 0;">
        <p style="margin:0;font-size:14px;color:#166534;line-height:1.6;">
          Ingresa a <strong>Mis Canjes</strong> para ver los detalles de tu premio.
        </p>
       </div>`
    : ''

  return `
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#fff;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;background:#16a34a;border-radius:50%;">
          <span style="font-size:30px;">🎁</span>
        </div>
        <h1 style="margin-top:12px;font-size:20px;color:#1e3a8a;margin-bottom:0;">¡Tu premio está listo!</h1>
      </div>
      <p style="color:#374151;">Hola <strong>${params.userName}</strong>,</p>
      <p style="color:#374151;line-height:1.6;">Tu ejecutivo de Dismant procesó la entrega de <strong>${params.skuName}</strong>.</p>
      ${codeBlock}${fileBlock}${fallback}
      <div style="background:#f8fafc;border-radius:10px;padding:14px;margin:20px 0;text-align:center;">
        <p style="margin:0 0 4px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Referencia del canje</p>
        <p style="margin:0;font-size:22px;font-family:monospace;font-weight:700;letter-spacing:5px;color:#374151;">${params.voucherCode}</p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/redemptions"
           style="display:inline-block;background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Ver mis canjes →
        </a>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;">Club Momentos Dismant · Guarda este correo como comprobante.</p>
    </div>
  `
}

/** Premio físico confirmado como entregado */
export function buildPhysicalDeliveredEmail(params: {
  userName:    string
  skuName:     string
  voucherCode: string
}): string {
  return `
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#fff;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;background:#16a34a;border-radius:50%;">
          <span style="font-size:30px;">✅</span>
        </div>
        <h1 style="margin-top:12px;font-size:20px;color:#1e3a8a;margin-bottom:0;">¡Entrega confirmada!</h1>
      </div>
      <p style="color:#374151;">Hola <strong>${params.userName}</strong>,</p>
      <p style="color:#374151;line-height:1.6;">
        Tu ejecutivo de Dismant ha confirmado que tu premio <strong>${params.skuName}</strong> fue entregado exitosamente.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:24px 0;">
        <p style="margin:0;font-size:14px;color:#166534;line-height:1.6;">
          Si tienes alguna duda sobre tu entrega, comunícate directamente con tu ejecutivo de cuenta en Dismant.
        </p>
      </div>
      <div style="background:#f8fafc;border-radius:10px;padding:14px;margin:20px 0;text-align:center;">
        <p style="margin:0 0 4px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Referencia del canje</p>
        <p style="margin:0;font-size:22px;font-family:monospace;font-weight:700;letter-spacing:5px;color:#374151;">${params.voucherCode}</p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/redemptions"
           style="display:inline-block;background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Ver mis canjes →
        </a>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;">Club Momentos Dismant · Gracias por confiar en nosotros.</p>
    </div>
  `
}

/** Notificación de envío físico con guía de rastreo */
export function buildShippingNotificationEmail(params: {
  userName:       string
  skuName:        string
  carrier:        string
  trackingNumber: string
  trackingUrl?:   string
  estimatedDate?: string
}): string {
  const trackingBlock = params.trackingUrl
    ? `<div style="text-align:center;margin:16px 0;">
        <a href="${params.trackingUrl}"
           style="display:inline-block;background:#0ea5e9;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Rastrear envío →
        </a>
       </div>`
    : ''
  const dateRow = params.estimatedDate
    ? `<tr>
        <td style="padding:8px 0;color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb;">Entrega estimada</td>
        <td style="padding:8px 0;text-align:right;font-weight:600;color:#111827;border-top:1px solid #e5e7eb;">${params.estimatedDate}</td>
       </tr>`
    : ''

  return `
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#fff;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;background:#0ea5e9;border-radius:50%;">
          <span style="font-size:30px;">🚚</span>
        </div>
        <h1 style="margin-top:12px;font-size:20px;color:#1e3a8a;margin-bottom:0;">Tu premio está en camino</h1>
      </div>

      <p style="color:#374151;">Hola <strong>${params.userName}</strong>,</p>
      <p style="color:#374151;line-height:1.6;">
        ¡Buenas noticias! Tu premio <strong>${params.skuName}</strong> ha sido enviado y está en tránsito.
      </p>

      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:20px;margin:24px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;">Paquetería</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#111827;">${params.carrier}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb;">Número de guía</td>
            <td style="padding:8px 0;text-align:right;font-family:monospace;font-size:15px;font-weight:700;color:#0369a1;border-top:1px solid #e5e7eb;">${params.trackingNumber}</td>
          </tr>
          ${dateRow}
        </table>
        ${trackingBlock}
      </div>

      <div style="text-align:center;margin:28px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/redemptions"
           style="display:inline-block;background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Ver mis canjes →
        </a>
      </div>

      <p style="color:#9ca3af;font-size:12px;text-align:center;">
        Club Momentos Dismant · Si tienes dudas sobre tu envío, contacta a tu ejecutivo.
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
