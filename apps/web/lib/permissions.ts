/**
 * Matriz de permisos RBAC del sistema.
 * Cada rol define qué acciones puede ejecutar.
 * Los endpoints de API usan estas constantes para sus guardas.
 */

export const ROLES = {
  OWNER:      'owner',
  ADMIN:      'admin',
  TEAM_ADMIN: 'team_admin',
  EMPLOYEE:   'employee',
  MEMBER:     'member',
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

// Roles que tienen acceso al panel de administración
export const STAFF_ROLES: Role[] = ['owner', 'admin', 'team_admin', 'employee']

// Roles con permisos de gestión operativa completa y visibilidad GLOBAL
// (ambas empresas). Exclusivos para Equipo y Configuración.
export const MANAGER_ROLES: Role[] = ['owner', 'admin']

// Roles con permisos de gestión operativa completa (facturas, canjes,
// catálogo, aliados, promociones, invitaciones, reportes, auditoría) sea
// cual sea su alcance de datos — owner/admin ven ambas empresas,
// team_admin solo la suya (ver lib/scope.ts).
export const SCOPED_MANAGER_ROLES: Role[] = ['owner', 'admin', 'team_admin']

// ── Rutas del panel admin accesibles por rol ────────────────

/** Rutas de /admin accesibles por TODOS los staff */
export const EMPLOYEE_ROUTES = [
  '/admin/dashboard',
  '/admin/members',
  '/admin/invoices',
  '/admin/redemptions',
]

/** Rutas de /admin exclusivas para owner y admin (visibilidad global) */
export const MANAGER_ONLY_ROUTES = [
  '/admin/catalog',
  '/admin/partners',
  '/admin/invitations',
  '/admin/promotions',
  '/admin/reports',
  '/admin/audit',
  '/admin/settings',
  '/admin/team',
]

/** De MANAGER_ONLY_ROUTES, las que team_admin SÍ puede usar (scoped a su empresa) */
export const TEAM_ADMIN_ROUTES = [
  '/admin/catalog',
  '/admin/partners',
  '/admin/invitations',
  '/admin/promotions',
  '/admin/reports',
  '/admin/audit',
]

// ── Acciones específicas por endpoint ────────────────────────

export const PERMISSIONS = {
  // Facturas
  VIEW_INVOICES:    STAFF_ROLES,
  REGISTER_INVOICE: STAFF_ROLES,   // cualquier staff puede registrar manualmente
  APPROVE_INVOICE:  STAFF_ROLES,
  REJECT_INVOICE:   STAFF_ROLES,
  VERIFY_INVOICE:   SCOPED_MANAGER_ROLES, // owner/admin/team_admin verifican y acreditan puntos

  // Miembros
  VIEW_MEMBERS:     STAFF_ROLES,
  SUSPEND_MEMBER:   SCOPED_MANAGER_ROLES,
  ADJUST_POINTS:    SCOPED_MANAGER_ROLES,

  // Catálogo
  VIEW_CATALOG:     STAFF_ROLES,
  MANAGE_CATALOG:   SCOPED_MANAGER_ROLES,

  // Aliados
  MANAGE_PARTNERS:  SCOPED_MANAGER_ROLES,

  // Promociones
  MANAGE_PROMOTIONS: SCOPED_MANAGER_ROLES,

  // Invitaciones
  MANAGE_INVITATIONS: SCOPED_MANAGER_ROLES,

  // Reportes y auditoría
  VIEW_REPORTS:     SCOPED_MANAGER_ROLES,
  VIEW_AUDIT:       SCOPED_MANAGER_ROLES,

  // Configuración y roles — exclusivo del Propietario
  MANAGE_SETTINGS:  ['owner'] as Role[],
  CHANGE_ROLES:     ['owner'] as Role[],

  // Equipo interno — exclusivo de los roles globales
  MANAGE_TEAM:      MANAGER_ROLES,
} satisfies Record<string, Role[]>

/** Verifica si un rol tiene un permiso dado */
export function hasPermission(role: string, permission: keyof typeof PERMISSIONS): boolean {
  return (PERMISSIONS[permission] as string[]).includes(role)
}

/** Verifica si un rol tiene acceso a una ruta de admin */
export function canAccessAdminRoute(role: string, pathname: string): boolean {
  if (!STAFF_ROLES.includes(role as Role)) return false
  if (MANAGER_ROLES.includes(role as Role)) return true // owner y admin acceden a todo
  const allowed = role === 'team_admin'
    ? [...EMPLOYEE_ROUTES, ...TEAM_ADMIN_ROUTES] // todo lo operativo, scoped a su empresa
    : EMPLOYEE_ROUTES                             // employee: solo rutas explícitas
  return allowed.some(route => pathname === route || pathname.startsWith(route + '/'))
}
