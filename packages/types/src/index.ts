// ─────────────────────────────────────────────────────────────
// Club Momentos Dismant — Tipos TypeScript compartidos
// ─────────────────────────────────────────────────────────────

// ── Roles ─────────────────────────────────────────────────────
export type UserRole = 'owner' | 'admin' | 'employee' | 'member'

// ── Estatus de Facturas ────────────────────────────────────────
export type InvoiceStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type SatStatus = 'vigente' | 'cancelada' | 'no_encontrada'

// ── Estatus de Premios ─────────────────────────────────────────
export type SkuStatus = 'active' | 'paused' | 'discontinued'
export type GeoType = 'national' | 'local'

// ── Tipos del Ledger ───────────────────────────────────────────
export type LedgerType =
  | 'invoice'
  | 'redemption'
  | 'welcome_bonus'
  | 'review_bonus'
  | 'adjustment'

// ── Estatus de Canjes ──────────────────────────────────────────
export type RedemptionStatus = 'active' | 'used' | 'expired'

// ── Estatus de Promociones ─────────────────────────────────────
export type PromotionStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'active'
  | 'expired'
  | 'rejected'

// ── Estatus de Miembros ────────────────────────────────────────
export type MemberStatus = 'active' | 'suspended'

// ── Respuesta API estándar ─────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// ── Payload de sesión JWT ──────────────────────────────────────
export interface SessionPayload {
  sub: string       // member ID
  email: string
  role: UserRole
  name: string
  iat: number
  exp: number
}

// ── Validación de CFDI ────────────────────────────────────────
export interface CfdiValidationResult {
  isValid: boolean
  satStatus: SatStatus
  rfcEmisor: string
  rfcReceptor: string
  totalMxn: number
  issuedAt: Date
  errorMessage?: string
}

// ── Cálculo de puntos ─────────────────────────────────────────
export interface PointsCalculation {
  amountMxn: number
  pointsPerAmount: number
  points: number
}

// ── Filtros de catálogo ───────────────────────────────────────
export interface CatalogFilters {
  locationState: string
  locationCity: string
  category?: string
  maxPoints?: number
  geoType?: GeoType | 'all'
}

// ── Estados de México ─────────────────────────────────────────
export const MEXICAN_STATES = [
  'Aguascalientes', 'Baja California', 'Baja California Sur',
  'Campeche', 'Chiapas', 'Chihuahua', 'Ciudad de México',
  'Coahuila', 'Colima', 'Durango', 'Estado de México',
  'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco',
  'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León',
  'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo',
  'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco',
  'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
] as const

export type MexicanState = typeof MEXICAN_STATES[number]
