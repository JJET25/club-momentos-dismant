// Ilustraciones de la página de inicio. Dibujadas en SVG para que escalen
// sin perder nitidez; decorativas (aria-hidden) salvo la del encabezado.

export function FlowIllustration() {
  return (
    <svg viewBox="0 0 520 150" fill="none" role="img" aria-label="De la factura a los puntos y al premio" className="w-full max-w-[520px] h-auto">
      <rect x="1" y="21" width="132" height="108" rx="16" fill="#FFFFFF" stroke="#C7D2FE" />
      <rect x="22" y="44" width="56" height="8" rx="4" fill="#C7D2FE" />
      <rect x="22" y="62" width="90" height="6" rx="3" fill="#E0E7FF" />
      <rect x="22" y="76" width="74" height="6" rx="3" fill="#E0E7FF" />
      <rect x="22" y="98" width="44" height="14" rx="7" fill="#DCFCE7" />
      <path d="M146 75h44" stroke="#A5B4FC" strokeWidth="2" strokeDasharray="4 6" />
      <path d="M184 69l8 6-8 6" stroke="#A5B4FC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="260" cy="75" r="54" fill="#4338CA" />
      <circle cx="260" cy="75" r="40" stroke="#818CF8" strokeWidth="2" />
      <text x="260" y="72" textAnchor="middle" fontSize="22" fontWeight="700" fill="#FFFFFF">pts</text>
      <rect x="236" y="84" width="48" height="6" rx="3" fill="#A5B4FC" />
      <path d="M328 75h44" stroke="#A5B4FC" strokeWidth="2" strokeDasharray="4 6" />
      <path d="M366 69l8 6-8 6" stroke="#A5B4FC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="387" y="21" width="132" height="108" rx="16" fill="#FFFFFF" stroke="#C7D2FE" />
      <rect x="421" y="62" width="64" height="48" rx="6" fill="#FEF3C7" stroke="#F59E0B" />
      <rect x="415" y="50" width="76" height="16" rx="5" fill="#FDE68A" stroke="#F59E0B" />
      <path d="M453 50v60" stroke="#F59E0B" strokeWidth="2" />
      <path d="M453 50c-8-14-24-12-20-2 3 6 20 2 20 2zm0 0c8-14 24-12 20-2-3 6-20 2-20 2z" stroke="#F59E0B" strokeWidth="2" fill="#FFFBEB" />
    </svg>
  )
}

export function BalanceIllustration() {
  return (
    <svg viewBox="0 0 300 120" fill="none" aria-hidden="true" className="w-full h-auto">
      <rect x="0" y="8" width="300" height="104" rx="14" fill="#EEF2FF" />
      <rect x="24" y="34" width="110" height="10" rx="5" fill="#A5B4FC" />
      <rect x="24" y="56" width="140" height="34" rx="8" fill="#4338CA" />
      <rect x="196" y="40" width="80" height="12" rx="6" fill="#C7D2FE" />
      <rect x="196" y="62" width="60" height="12" rx="6" fill="#E0E7FF" />
      <rect x="196" y="84" width="70" height="12" rx="6" fill="#E0E7FF" />
    </svg>
  )
}

export function StatementIllustration() {
  return (
    <svg viewBox="0 0 300 120" fill="none" aria-hidden="true" className="w-full h-auto">
      <rect x="0" y="8" width="300" height="104" rx="14" fill="#EEF2FF" />
      <path d="M24 92h252" stroke="#C7D2FE" strokeWidth="2" />
      <rect x="40" y="62" width="22" height="30" rx="4" fill="#A5B4FC" />
      <rect x="84" y="48" width="22" height="44" rx="4" fill="#A5B4FC" />
      <rect x="128" y="70" width="22" height="22" rx="4" fill="#A5B4FC" />
      <rect x="172" y="34" width="22" height="58" rx="4" fill="#4338CA" />
      <rect x="216" y="56" width="22" height="36" rx="4" fill="#A5B4FC" />
      <rect x="248" y="22" width="32" height="24" rx="5" fill="#FFFFFF" stroke="#4338CA" />
      <text x="264" y="38" textAnchor="middle" fontSize="10" fontWeight="700" fill="#4338CA">PDF</text>
    </svg>
  )
}

export function CatalogIllustration() {
  return (
    <svg viewBox="0 0 300 120" fill="none" aria-hidden="true" className="w-full h-auto">
      <rect x="0" y="8" width="300" height="104" rx="14" fill="#EEF2FF" />
      <rect x="24" y="28" width="76" height="64" rx="10" fill="#FFFFFF" stroke="#C7D2FE" />
      <rect x="112" y="28" width="76" height="64" rx="10" fill="#FFFFFF" stroke="#C7D2FE" />
      <rect x="200" y="28" width="76" height="64" rx="10" fill="#FFFFFF" stroke="#4338CA" strokeWidth="2" />
      <path d="M50 52h24v22H50zM46 46h32v8H46zM62 46v28" stroke="#F59E0B" strokeWidth="2" fill="#FEF3C7" />
      <circle cx="150" cy="58" r="13" stroke="#4338CA" strokeWidth="2" fill="#E0E7FF" />
      <path d="M150 52v12M144 58h12" stroke="#4338CA" strokeWidth="2" strokeLinecap="round" />
      <path d="M238 46c-8 0-12 6-12 12 0 9 12 18 12 18s12-9 12-18c0-6-4-12-12-12z" stroke="#4338CA" strokeWidth="2" fill="#E0E7FF" />
      <circle cx="238" cy="58" r="4" fill="#4338CA" />
    </svg>
  )
}
