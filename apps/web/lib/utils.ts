import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Combina clases de Tailwind de forma segura */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formatea un número como puntos: 1234 → "1,234 pts" */
export function formatPoints(points: number): string {
  return `${points.toLocaleString('es-MX')} pts`
}

/** Formatea un monto en MXN: 1234.5 → "$1,234.50" */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
}

/** Formatea una fecha: "15 ene 2025" */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

/** Formatea fecha con hora: "15 ene 2025, 14:30" */
export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

/** Trunca un UUID para mostrar: "XXXXXXXX-..." → "XXXXXXXX..." */
export function truncateUUID(uuid: string, chars = 8): string {
  return `${uuid.slice(0, chars)}...`
}

/** Genera un código de verificación OTP de 6 dígitos */
export function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/** Valida formato de RFC mexicano (persona física y moral) */
export function isValidRFC(rfc: string): boolean {
  const rfcMoral = /^[A-ZÑ&]{3}[0-9]{6}[A-Z0-9]{3}$/
  const rfcFisica = /^[A-ZÑ&]{4}[0-9]{6}[A-Z0-9]{3}$/
  const rfcGenerico = /^[X]{3}[X][0-9]{6}[X]{3}$/
  return rfcMoral.test(rfc) || rfcFisica.test(rfc) || rfcGenerico.test(rfc)
}

/** Valida formato de UUID (CFDI Folio Fiscal) */
export function isValidCFDIUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/** Calcula los puntos que genera una factura */
export function calculatePoints(amountMXN: number, pointsPerAmount = 100): number {
  return Math.floor(amountMXN / pointsPerAmount)
}

/** Verifica si una fecha de factura está dentro del período permitido */
export function isInvoiceWithinPeriod(issuedAt: Date | string, maxDays = 90): boolean {
  const issued = new Date(issuedAt)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - issued.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays <= maxDays
}
