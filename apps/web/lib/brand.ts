const BRANDS: Record<string, { name: string; short: string; initial: string }> = {
  dismant: { name: 'Club Momentos Dismant', short: 'Dismant', initial: 'D' },
  lauti:   { name: 'Club Momentos Lauti',   short: 'Lauti',   initial: 'L' },
}

export function getBrand(affiliate?: string | null) {
  return BRANDS[affiliate ?? 'dismant'] ?? BRANDS.dismant
}

// Paleta única de marca — azul/blanco para todos los affiliates. Solo el
// nombre y la inicial cambian según el cliente (dismant | lauti); el color
// nunca varía por affiliate para mantener consistencia visual entre correos.
export const BRAND_BLUE = '#2563eb'
export const BRAND_BLUE_DARK = '#1e3a8a'
