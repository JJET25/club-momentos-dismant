export const PERSPECTIVE_OPTIONS: { value: string; label: string }[] = [
  { value: '',        label: 'Todas las empresas' },
  { value: 'dismant',  label: 'Dismant' },
  { value: 'lauti',    label: 'Lauti' },
]

export function readPerspective(): string {
  const match = document.cookie.match(/(?:^|; )admin_perspective=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

export function setPerspective(value: string) {
  if (value) {
    document.cookie = `admin_perspective=${value}; path=/; max-age=${60 * 60 * 24 * 365}`
  } else {
    document.cookie = 'admin_perspective=; path=/; max-age=0'
  }
  window.location.reload()
}
