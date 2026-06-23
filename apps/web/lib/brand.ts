const BRANDS: Record<string, { name: string; initial: string }> = {
  dismant: { name: 'Club Momentos Dismant', initial: 'D' },
  lauti:   { name: 'Club Momentos Lauti',   initial: 'L' },
}

export function getBrand(affiliate?: string | null) {
  return BRANDS[affiliate ?? 'dismant'] ?? BRANDS.dismant
}
