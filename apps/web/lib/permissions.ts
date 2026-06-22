/**
 * Matriz de permisos RBAC del sistema.
 * Cada rol define qué acciones puede ejecutar.
 * Los endpoints de API usan estas constantes para sus guardas.
 */

export const ROLES = {
  OWNER:    'owner',
  ADMIN:    'admin',
  EMPLOYEE: 'employee',
  MEMBER:   'member',
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

// Roles que tienen acceso al panel de administración
export const STAFF_ROLES: Role[] = ['owner', 'admin', 'employee']

// Roles con permisos de gestión operativa completa (no solo lectura)
export const MANAGER_ROLES: Role[] = ['owner', 'admin']

// ── Rutas del panel admin accesibles por rol ────────────────

/** Rutas de /admin accesibles por TODOS los staff (owner + admin + employee) */
export const EMPLOYEE_ROUTES = [
  '/admin/dashboard',
  '/admin/members',
  '/admin/invoices',
  '/admin/redemptions',
]

/** Rutas de /admin exclusivas para owner y admin (no employee) */
export const MANAGER_ONLY_ROUTES = [
  '/admin/catalog',
  '/admin/invitations',
  '/admin/promotions',
  '/admin/reports',
  '/admin/audit',
  '/admin/settings',
  '/admin/team',
]

// ── Acciones específicas por endpoint ────────────────────────

export const PERMISSIONS = {
  // Facturas
  VIEW_INVOICES:    STAFF_ROLES,
  REGISTER_INVOICE: STAFF_ROLES,   // cualquier staff puede registrar manualmente
  APPROVE_INVOICE:  STAFF_ROLES,
  REJECT_INVOICE:   STAFF_ROLES,
  VERIFY_INVOICE:   MANAGER_ROLES, // solo owner/admin verifican y acreditan puntos

  // Miembros
  VIEW_MEMBERS:     STAFF_ROLES,
  SUSPEND_MEMBER:   MANAGER_ROLES,
  ADJUST_POINTS:    MANAGER_ROLES,

  // Catálogo
  VIEW_CATALOG:     STAFF_ROLES,
  MANAGE_CATALOG:   MANAGER_ROLES,

  // Invitaciones
  MANAGE_INVITATIONS: MANAGER_ROLES,

  // Reportes y auditoría
  VIEW_REPORTS:     MANAGER_ROLES,
  VIEW_AUDIT:       MANAGER_ROLES,

  // Configuración y roles
  MANAGE_SETTINGS:  ['owner'] as Role[],
  CHANGE_ROLES:     ['owner'] as Role[],
} satisfies Record<string, Role[]>

/** Verifica si un rol tiene un permiso dado */
export function hasPermission(role: string, permission: keyof typeof PERMISSIONS): boolean {
  return (PERMISSIONS[permission] as string[]).includes(role)
}

/** Verifica si un rol tiene acceso a una ruta de admin */
export function canAccessAdminRoute(role: string, pathname: string): boolean {
  if (!STAFF_ROLES.includes(role as Role)) return false
  if (MANAGER_ROLES.includes(role as Role)) return true // owner y admin acceden a todo
  // employee: solo rutas explícitamente permitidas
  return EMPLOYEE_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))
}
