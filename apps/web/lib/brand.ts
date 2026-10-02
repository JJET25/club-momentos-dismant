type BrandScale = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950, string>

interface BrandConfig {
  name:        string
  short:       string
  initial:     string
  /** Azul/acento principal de la marca — botones, headers, enlaces */
  primary:     string
  /** Mismo primario en tripleta HSL ("H S% L%"), para sobreescribir la
   *  variable CSS --primary de shadcn/ui (hsl(var(--primary))) */
  primaryHsl:  string
  /** Tono oscuro del primario — títulos, texto sobre fondo claro */
  primaryDark: string
  /** Color de acento secundario de la marca (CTAs destacados) */
  accent:      string
  /** Escala tipo Tailwind (50 claro → 950 oscuro) en tripletas HSL, usada
   *  para sobreescribir --brand-50..950 y así re-temar cualquier clase
   *  `brand-*` ya existente en la app (sidebars, botones, inputs) sin tocar
   *  cada componente. 600 coincide con `primary`. */
  scale:       BrandScale
  /** Fondo del sidebar (admin y portal cliente) */
  sidebarBg:   string
  /** Logo oficial servido desde /public/brand — placeholder de baja resolución
   *  tomado del sitio público mientras se recibe el archivo oficial en alta.
   *  Ausente cuando no hay un affiliate específico (ej. vista combinada admin). */
  logo?:       string
}

// Escala default (azul genérico) — es la misma que ya usaba el Tailwind
// config antes de volverse dinámico, así que /login y cualquier vista sin
// affiliate conocido se ven exactamente igual que antes.
const GENERIC_SCALE: BrandScale = {
  50: '213.8 100% 96.9%', 100: '214.3 94.6% 92.7%', 200: '213.3 96.9% 87.3%',
  300: '211.7 96.4% 78.4%', 400: '213.1 93.9% 67.8%', 500: '217.2 91.2% 59.8%',
  600: '221.2 83.2% 53.3%', 700: '224.3 76.3% 48%', 800: '225.9 70.7% 40.2%',
  900: '224.4 64.3% 32.9%', 950: '226.2 57% 21%',
}

/** Vista sin affiliate específico (roles globales viendo ambas empresas combinadas) */
export const GENERIC_BRAND: BrandConfig = {
  name: 'Club Momentos', short: 'Club Momentos', initial: '•',
  primary: '#2563eb', primaryHsl: '221.2 83.2% 53.3%', primaryDark: '#1e3a8a', accent: '#2563eb',
  scale: GENERIC_SCALE, sidebarBg: '#0f172a',
}

/** Página de inicio del proyecto (dominio de entrada): índigo neutral, sin marca de empresa. */
export const HUB_BRAND: BrandConfig = {
  name: 'Club Momentos', short: 'Club Momentos', initial: 'CM',
  primary: '#4338CA', primaryHsl: '244.5 57.9% 50.6%', primaryDark: '#1E1B4B', accent: '#4338CA',
  scale: {
    50: '225.9 100% 96.7%', 100: '226.5 100% 93.9%', 200: '228 96.5% 88.8%',
    300: '229.7 93.5% 81.8%', 400: '234.5 89.5% 73.9%', 500: '238.7 83.5% 66.7%',
    600: '244.5 57.9% 50.6%', 700: '243.7 54.5% 41.4%', 800: '242.2 47.4% 34.3%',
    900: '243.8 47.1% 20%', 950: '243.2 46.8% 15.5%',
  },
  sidebarBg: '#1E1B4B',
}

// Colores extraídos de los logos y sitios oficiales de cada empresa
// (dismant.com.mx / silauti.com.mx) — pendientes de confirmar contra manual
// de marca si existe uno más preciso. Las escalas se generan conservando el
// hue/saturación de cada marca y variando solo la luminosidad (mismo patrón
// relativo que la escala "blue" de Tailwind, anclado en 600 = primary).
const BRANDS: Record<string, BrandConfig> = {
  // Confirmado con el equipo: azul vívido (derivado del logo, ajustado para
  // buen contraste de texto/botones — 7.56:1 en blanco sobre #2546C7) + el
  // rojo de la flama del logo (coincide con --porto-secondary-color del
  // sitio) como acento.
  dismant: {
    name: 'Club Momentos Dismant', short: 'Dismant', initial: 'D',
    primary: '#2546C7', primaryHsl: '227.8 68.6% 46.3%', primaryDark: '#1B2F57', accent: '#DE291E',
    scale: {
      50: '227.8 68.6% 89.8%', 100: '227.8 68.6% 85.7%', 200: '227.8 68.6% 80.2%',
      300: '227.8 68.6% 71.4%', 400: '227.8 68.6% 60.8%', 500: '227.8 68.6% 52.7%',
      600: '227.8 68.6% 46.3%', 700: '227.8 68.6% 41.0%', 800: '227.8 68.6% 33.1%',
      900: '227.8 68.6% 25.9%', 950: '227.8 68.6% 13.9%',
    },
    sidebarBg: '#0f172a',
    logo: '/brand/dismant.png',
  },
  // Confirmado con el equipo a partir de los 3 colores reales de silauti.com.mx:
  // #2c353f (gris, prioridad) como fondo del sidebar, #0f67b8 como primario
  // (botones/links, 5.75:1 de contraste), #32b3e1 como acento — se usa en los
  // pasos 400/500 de la escala (iconos y texto del sidebar), donde sí tiene
  // buen contraste contra el gris (5.1–7.5:1); sobre blanco no pasa el mínimo
  // de accesibilidad (2.42:1), por eso no se usa como botón ni texto suelto.
  lauti: {
    name: 'Club Momentos Lauti', short: 'Lauti', initial: 'L',
    primary: '#0f67b8', primaryHsl: '208.8 84.9% 39.0%', primaryDark: '#2c353f', accent: '#32b3e1',
    scale: {
      50: '197.6 81% 95.9%', 100: '196.7 78.3% 91.0%', 200: '194.8 74.7% 82.9%',
      300: '195.6 74.6% 73.7%', 400: '195.9 75.3% 63.5%', 500: '195.8 74.5% 53.9%',
      600: '208.8 84.9% 39.0%', 700: '211.2 39.4% 25.9%', 800: '211.6 17.8% 21.0%',
      900: '210.0 20.0% 15.7%', 950: '212.3 19.4% 13.1%',
    },
    sidebarBg: '#2c353f',
    logo: '/brand/lauti.png',
  },
}

export function getBrand(affiliate?: string | null): BrandConfig {
  return BRANDS[affiliate ?? 'dismant'] ?? BRANDS.dismant
}

/**
 * Variables CSS a inyectar en un `style` de React (spread directo) para que
 * toda la app —clases `bg-primary`/`text-primary` y `brand-50`..`brand-950`—
 * se retematice según el affiliate, sin tocar cada componente.
 */
export function getBrandCssVars(brand: BrandConfig): Record<string, string> {
  const vars: Record<string, string> = { '--primary': brand.primaryHsl }
  for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const) {
    vars[`--brand-${step}`] = brand.scale[step]
  }
  return vars
}
