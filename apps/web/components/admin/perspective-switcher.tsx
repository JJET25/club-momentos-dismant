export const PERSPECTIVE_OPTIONS: { value: string; label: string; hint?: string }[] = [
  { value: '',        label: 'Global', hint: 'Todas las empresas' },
  { value: 'dismant',  label: 'Dismant' },
  { value: 'lauti',    label: 'Lauti' },
]

/** Opciones visibles para una sesión: la vista combinada solo para roles
 *  globales; el staff scoped solo ve las empresas que tiene asignadas. */
export function perspectiveOptionsFor(isGlobal: boolean, allowed: string[]) {
  return PERSPECTIVE_OPTIONS.filter(o => (o.value === '' ? isGlobal : allowed.includes(o.value)))
}

export function setPerspective(value: string) {
  if (value) {
    document.cookie = `admin_perspective=${value}; path=/; max-age=${60 * 60 * 24 * 365}`
  } else {
    document.cookie = 'admin_perspective=; path=/; max-age=0'
  }
  window.location.reload()
}
