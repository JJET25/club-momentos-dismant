const FACTURAPI_BASE = 'https://www.facturapi.io/v2'

function headers(): HeadersInit | null {
  const key = process.env.FACTURAPI_SECRET_KEY
  if (!key) return null
  return { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }
}

export type CfdiStatus = 'vigente' | 'cancelado' | 'no_encontrado'

export interface CfdiVerification {
  valid:   boolean
  status:  CfdiStatus
  message: string
}

/** Verifica un CFDI ante el SAT vía Facturapi.
 *  Si Facturapi no está configurado, devuelve valid=true (modo dev). */
export async function verifyCFDI(params: {
  uuid:        string
  rfcEmisor:   string
  rfcReceptor: string
  total:       number
}): Promise<CfdiVerification> {
  const hdrs = headers()
  if (!hdrs) {
    console.warn('[Facturapi] No configurado — verificación SAT omitida')
    return { valid: true, status: 'vigente', message: 'Facturapi no configurado' }
  }

  const qs = new URLSearchParams({
    uuid:         params.uuid,
    rfc_emisor:   params.rfcEmisor,
    rfc_receptor: params.rfcReceptor,
    total:        params.total.toFixed(2),
  })

  const res = await fetch(`${FACTURAPI_BASE}/tools/verify-cfdi?${qs}`, {
    headers: hdrs,
    signal:  AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[Facturapi] HTTP error:', res.status, body)
    throw new Error(`Facturapi ${res.status}: ${body}`)
  }

  const data = await res.json()
  const status = (data.status ?? 'no_encontrado') as CfdiStatus
  return {
    valid:   status === 'vigente',
    status,
    message: data.message ?? status,
  }
}
