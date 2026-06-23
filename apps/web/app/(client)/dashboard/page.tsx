import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ElementType } from 'react'
import {
  BadgeCheck, ChevronRight, Globe, MapPin, Tag,
  Zap, Gift, FileCheck, TrendingUp, ArrowUpRight, ArrowDownLeft, Wrench, Star, PartyPopper,
  AlertTriangle, Check, Ticket,
} from 'lucide-react'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { getSignedDownloadUrl } from '@/lib/storage'
import { NotificationsSection } from './notifications-section'

// ── Tipos ─────────────────────────────────────────────────────

interface Movement {
  id: string; type: string; points: number; balance_after: number
  description: string | null; created_at: string; expires_at: string | null
}
interface PromoPartner { name: string; logo_url: string | null; is_verified: boolean }
interface FeaturedPromo {
  id: string; title: string; description: string | null; bannerUrl: string | null
  valid_until: string; featured: boolean; geo_type: string; partners: PromoPartner | null
}
interface SuggestedSku {
  id: string; name: string; image_url: string | null; points_cost: number
  category: string | null; is_digital: boolean; canAfford: boolean
}
interface NextReward { name: string; pointsCost: number; canAfford: boolean; ptsNeeded: number }
interface DashboardData {
  currentBalance: number; pointsThisMonth: number; pointsRedeemed: number
  invoicesApproved: number; recentMovements: Movement[]
  expiring: { points: number; date: string } | null
  memberName: string; nextReward: NextReward | null
  featuredPromos: FeaturedPromo[]; suggestedSkus: SuggestedSku[]
}

// ── Helpers ───────────────────────────────────────────────────

function fmtPts(n: number)  { return n.toLocaleString('es-MX') }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}
function greeting() {
  const h = new Date().getUTCHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}
function firstName(name: string) { return name.split(' ')[0] }

// ── Hero ──────────────────────────────────────────────────────

function HeroCard({ data }: { data: DashboardData }) {
  const nr = data.nextReward
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 text-white p-7 md:p-8">
      <div className="pointer-events-none absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-16 right-20 w-44 h-44 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute top-6 right-36 w-20 h-20 rounded-full bg-white/[0.07]" />
      <div className="pointer-events-none absolute bottom-4 left-1/2 w-10 h-10 rounded-full bg-white/10" />

      <div className="relative flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1">
          <p className="text-blue-200 text-sm font-medium mb-4">
            {greeting()}, {firstName(data.memberName)}
          </p>
          <p className="text-blue-200 text-sm font-medium mb-1">Puntos disponibles</p>
          <div className="flex items-end gap-2">
            <p className="text-6xl md:text-7xl font-bold tracking-tight leading-none">
              {fmtPts(data.currentBalance)}
            </p>
            <span className="text-blue-300 text-lg mb-1">pts</span>
          </div>
          {data.expiring && (
            <p className="mt-3 text-xs text-amber-300 bg-amber-400/20 border border-amber-400/30 rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {fmtPts(data.expiring.points)} pts vencen el {fmtShortDate(data.expiring.date)}
            </p>
          )}
        </div>

        {nr && (
          <div className="md:w-56 shrink-0 bg-white/10 border border-white/20 rounded-xl p-4 backdrop-blur-sm">
            {nr.canAfford ? (
              <>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wide">Listo para canjear</p>
                </div>
                <p className="text-sm font-semibold text-white leading-snug line-clamp-2">{nr.name}</p>
                <p className="text-blue-200 text-xs mt-1">{fmtPts(nr.pointsCost)} pts</p>
                <Link href="/catalog"
                  className="mt-3 flex items-center justify-center gap-1 w-full py-1.5 rounded-lg bg-white text-blue-700 text-xs font-bold hover:bg-blue-50 transition-colors">
                  Canjear ahora <ChevronRight className="w-3 h-3" />
                </Link>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-300 shrink-0" />
                  <p className="text-[11px] font-semibold text-blue-200 uppercase tracking-wide">Próximo premio</p>
                </div>
                <p className="text-sm font-semibold text-white leading-snug line-clamp-2">{nr.name}</p>
                <div className="mt-2.5">
                  <div className="flex justify-between text-[10px] text-blue-200 mb-1">
                    <span>{fmtPts(data.currentBalance)} pts</span>
                    <span>{fmtPts(nr.pointsCost)} pts</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white/80 transition-all"
                      style={{ width: `${Math.min(100, Math.round((data.currentBalance / nr.pointsCost) * 100))}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-blue-200 mt-1.5">
                    Faltan <strong className="text-white">{fmtPts(nr.ptsNeeded)} pts</strong>
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── KPI Strip ─────────────────────────────────────────────────

function KpiStrip({ data }: { data: DashboardData }) {
  const items = [
    { label: 'Ganados este mes',    value: `+${fmtPts(data.pointsThisMonth)}`, sub: 'puntos',   icon: Zap,       accent: 'text-blue-500',    bg: 'bg-blue-500/10'   },
    { label: 'Canjeados histórico', value: fmtPts(data.pointsRedeemed),        sub: 'puntos',   icon: Gift,      accent: 'text-orange-500',  bg: 'bg-orange-500/10' },
    { label: 'Facturas validadas',  value: String(data.invoicesApproved),      sub: 'facturas', icon: FileCheck, accent: 'text-emerald-500', bg: 'bg-emerald-500/10'},
  ]
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map(({ label, value, sub, icon: Icon, accent, bg }) => (
        <div key={label} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${accent}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Promo Banner ──────────────────────────────────────────────

function PromoBanner({ promo }: { promo: FeaturedPromo }) {
  const partner = promo.partners
  return (
    <Link href="/promotions" className="group block bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className="relative aspect-[2/1] bg-gradient-to-br from-primary/15 via-primary/5 to-muted overflow-hidden">
        {promo.bannerUrl ? (
          <img src={promo.bannerUrl} alt={promo.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Tag className="w-10 h-10 text-muted-foreground/20" />
          </div>
        )}
        {promo.bannerUrl && (
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/65 to-transparent" />
        )}
        {promo.featured && (
          <div className="absolute top-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-white shadow">
              <Star className="w-2.5 h-2.5 fill-white" /> Destacada
            </span>
          </div>
        )}
        {partner && (
          <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5">
            {partner.logo_url
              ? <img src={partner.logo_url} alt="" className="w-5 h-5 rounded-full bg-white object-contain ring-1 ring-white/30 shrink-0" />
              : <div className="w-5 h-5 rounded-full bg-white/20 ring-1 ring-white/30 flex items-center justify-center shrink-0">
                  <span className="text-[8px] font-bold text-white">{partner.name[0]}</span>
                </div>
            }
            <span className="text-[11px] font-medium text-white">{partner.name}</span>
            {partner.is_verified && <BadgeCheck className="w-3 h-3 text-blue-300 shrink-0" />}
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{promo.title}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {promo.geo_type === 'national' ? <><Globe className="w-3 h-3" />Nacional</> : <><MapPin className="w-3 h-3" />Local</>}
          </span>
          <span className="text-[11px] text-muted-foreground">Hasta {fmtShortDate(promo.valid_until)}</span>
        </div>
      </div>
    </Link>
  )
}

// ── SKU Card ──────────────────────────────────────────────────

function SkuCard({ sku, balance }: { sku: SuggestedSku; balance: number }) {
  const missing = sku.points_cost - balance
  const pct = Math.min(100, Math.round((balance / sku.points_cost) * 100))
  return (
    <Link href="/catalog" className="group block bg-card border border-border rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="aspect-[4/3] bg-muted/40 flex items-center justify-center overflow-hidden relative">
        {sku.image_url ? (
          <img src={sku.image_url} alt={sku.name} className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300" />
        ) : (
          <div className="flex items-center justify-center">
            {sku.is_digital ? <Ticket className="w-10 h-10 text-muted-foreground/25" /> : <Gift className="w-10 h-10 text-muted-foreground/25" />}
          </div>
        )}
        {sku.canAfford && (
          <div className="absolute top-2 right-2">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-sm">¡Disponible!</span>
          </div>
        )}
        {sku.is_digital && (
          <div className="absolute top-2 left-2">
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/80 text-white">Digital</span>
          </div>
        )}
      </div>
      <div className="p-3.5 space-y-2">
        <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug min-h-[2.5rem]">{sku.name}</p>
        <p className="text-base font-bold text-primary">{fmtPts(sku.points_cost)} <span className="text-xs font-normal text-muted-foreground">pts</span></p>
        {sku.canAfford ? (
          <div className="flex items-center gap-1.5 text-emerald-600">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium">Puedes canjear</span>
          </div>
        ) : (
          <div>
            <div className="h-1 rounded-full bg-muted overflow-hidden mb-1">
              <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground">Faltan <strong className="text-foreground">{fmtPts(missing)}</strong> pts</p>
          </div>
        )}
      </div>
    </Link>
  )
}

// ── Movement Row ──────────────────────────────────────────────

const MOVEMENT_CFG: Record<string, { label: string; Icon: ElementType; bg: string; color: string }> = {
  invoice:       { label: 'Factura aprobada',  Icon: FileCheck,    bg: 'bg-emerald-500/10', color: 'text-emerald-500' },
  credit:        { label: 'Crédito',           Icon: ArrowUpRight, bg: 'bg-emerald-500/10', color: 'text-emerald-500' },
  redemption:    { label: 'Canje',             Icon: Gift,         bg: 'bg-orange-500/10',  color: 'text-orange-500'  },
  debit:         { label: 'Débito',            Icon: ArrowDownLeft,bg: 'bg-red-500/10',     color: 'text-red-500'     },
  welcome_bonus: { label: 'Bono bienvenida',   Icon: PartyPopper,  bg: 'bg-blue-500/10',   color: 'text-blue-500'    },
  review_bonus:  { label: 'Bono reseña',       Icon: Star,         bg: 'bg-yellow-500/10', color: 'text-yellow-500'  },
  adjustment:    { label: 'Ajuste',            Icon: Wrench,       bg: 'bg-gray-500/10',   color: 'text-gray-500'    },
}

function MovementRow({ m }: { m: Movement }) {
  const cfg = MOVEMENT_CFG[m.type] ?? MOVEMENT_CFG.adjustment
  const Icon = cfg.Icon
  const isPositive = m.points > 0
  return (
    <li className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
      <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{m.description ?? cfg.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(m.created_at)}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold tabular-nums ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
          {isPositive ? '+' : ''}{fmtPts(m.points)} pts
        </p>
        <p className="text-[11px] text-muted-foreground tabular-nums">Saldo: {fmtPts(m.balance_after)}</p>
      </div>
    </li>
  )
}

// ── Página ────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    redirect('/login')
  }

  const supabase  = createAdminClient()
  const memberId  = session.sub
  const now       = new Date()
  const nowIso    = now.toISOString()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const in30Days  = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    movementsRes, monthRes, redeemedRes, invoicesRes, expiringRes,
    memberRes, pastRedemptionsRes, promosRes, skusRes,
  ] = await Promise.all([
    supabase.from('ledger_entries')
      .select('id, type, points, balance_after, description, created_at, expires_at')
      .eq('member_id', memberId).order('created_at', { ascending: false }).limit(5),

    supabase.from('ledger_entries')
      .select('points').eq('member_id', memberId)
      .gte('created_at', startOfMonth).gt('points', 0),

    supabase.from('ledger_entries')
      .select('points').eq('member_id', memberId).eq('type', 'redemption'),

    supabase.from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', memberId).eq('status', 'approved'),

    supabase.from('ledger_entries')
      .select('points, expires_at').eq('member_id', memberId)
      .gt('points', 0).gte('expires_at', nowIso).lte('expires_at', in30Days),

    supabase.from('members')
      .select('location_state, location_city, full_name').eq('id', memberId).single(),

    supabase.from('redemptions')
      .select('reward_skus!sku_id(category)').eq('member_id', memberId).limit(20),

    supabase.from('partner_promotions')
      .select('id, title, description, image_url, banner_key, valid_until, featured, geo_type, geo_states, geo_cities, partners!partner_id(name, logo_url, is_verified)')
      .eq('status', 'active').lte('valid_from', nowIso).gte('valid_until', nowIso)
      .order('featured', { ascending: false }).order('created_at', { ascending: false }).limit(10),

    supabase.from('reward_skus')
      .select('id, name, image_url, points_cost, category, is_digital, geo_type, geo_states, geo_cities, stock')
      .eq('status', 'active').order('points_cost', { ascending: true }),
  ])

  const recentMovements  = movementsRes.data ?? []
  const currentBalance   = recentMovements[0]?.balance_after ?? 0
  const pointsThisMonth  = (monthRes.data ?? []).reduce((s, e) => s + e.points, 0)
  const pointsRedeemed   = (redeemedRes.data ?? []).reduce((s, e) => s + Math.abs(e.points), 0)
  const invoicesApproved = invoicesRes.count ?? 0

  const expiringPoints = (expiringRes.data ?? []).reduce((s, e) => s + e.points, 0)
  const expiringDate   = expiringRes.data?.[0]?.expires_at ?? null

  const memberState = memberRes.data?.location_state ?? ''
  const memberCity  = memberRes.data?.location_city  ?? ''
  const memberName  = memberRes.data?.full_name ?? ''

  const redeemedCategories = [
    ...new Set(
      (pastRedemptionsRes.data ?? [])
        .map(r => (r.reward_skus as unknown as { category: string | null } | null)?.category)
        .filter(Boolean) as string[]
    ),
  ]

  const allPromos = promosRes.data ?? []
  const geoPromos = allPromos.filter(p => {
    if (p.geo_type === 'national') return true
    return (p.geo_states as string[] ?? []).includes(memberState) ||
           (p.geo_cities as string[] ?? []).includes(memberCity)
  }).slice(0, 3)

  const featuredPromos: FeaturedPromo[] = await Promise.all(
    geoPromos.map(async p => {
      let bannerUrl: string | null = p.image_url ?? null
      if (p.banner_key) {
        bannerUrl = await getSignedDownloadUrl(p.banner_key as string, 3600).catch(() => p.image_url ?? null)
      }
      const partner = (p.partners as unknown) as PromoPartner | null
      return { id: p.id, title: p.title, description: p.description, bannerUrl, valid_until: p.valid_until, featured: p.featured ?? false, geo_type: p.geo_type, partners: partner }
    })
  )

  const allSkus = skusRes.data ?? []
  const geoSkus = allSkus.filter(s => {
    if (s.geo_type === 'national') return true
    return (s.geo_states as string[] ?? []).includes(memberState) ||
           (s.geo_cities as string[] ?? []).includes(memberCity)
  }).filter(s => s.stock === null || s.stock > 0)

  const canAfford    = geoSkus.filter(s => s.points_cost <= currentBalance)
  const almostAfford = geoSkus.filter(s =>
    s.points_cost > currentBalance && s.points_cost <= Math.max(currentBalance * 1.6, currentBalance + 300)
  )
  const fromHistory = canAfford.filter(s => redeemedCategories.includes(s.category ?? ''))
  const otherAfford = canAfford.filter(s => !redeemedCategories.includes(s.category ?? ''))
  const suggestedSkus: SuggestedSku[] = [...fromHistory, ...otherAfford, ...almostAfford].slice(0, 4)
    .map(s => ({ id: s.id, name: s.name, image_url: s.image_url, points_cost: s.points_cost, category: s.category, is_digital: s.is_digital, canAfford: s.points_cost <= currentBalance }))

  const bestAffordable = [...canAfford].sort((a, b) => b.points_cost - a.points_cost)[0] ?? null
  const cheapestAny    = [...geoSkus].sort((a, b) => a.points_cost - b.points_cost)[0] ?? null
  const nextRewardRaw  = bestAffordable ?? cheapestAny
  const nextReward: NextReward | null = nextRewardRaw ? {
    name:       nextRewardRaw.name,
    pointsCost: nextRewardRaw.points_cost,
    canAfford:  nextRewardRaw.points_cost <= currentBalance,
    ptsNeeded:  Math.max(0, nextRewardRaw.points_cost - currentBalance),
  } : null

  const data: DashboardData = {
    currentBalance, pointsThisMonth, pointsRedeemed, invoicesApproved,
    recentMovements: recentMovements as Movement[],
    expiring: expiringPoints > 0 ? { points: expiringPoints, date: expiringDate! } : null,
    memberName, nextReward, featuredPromos, suggestedSkus,
  }

  return (
    <div className="space-y-7">

      <HeroCard data={data} />
      <KpiStrip data={data} />

      {data.featuredPromos.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Promociones para ti</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Ofertas activas en tu zona</p>
            </div>
            <Link href="/promotions" className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className={`grid gap-4 ${
            data.featuredPromos.length === 1 ? 'grid-cols-1 max-w-sm' :
            data.featuredPromos.length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}>
            {data.featuredPromos.map(p => <PromoBanner key={p.id} promo={p} />)}
          </div>
        </section>
      )}

      {data.suggestedSkus.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Premios sugeridos</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.suggestedSkus.some(s => s.canAfford) ? 'Basado en tus compras anteriores' : 'Empieza a acumular para obtenerlos'}
              </p>
            </div>
            <Link href="/catalog" className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
              Ver catálogo <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.suggestedSkus.map(s => <SkuCard key={s.id} sku={s} balance={data.currentBalance} />)}
          </div>
        </section>
      )}

      <NotificationsSection />

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Últimos movimientos</h2>
          <Link href="/statement" className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
            Ver todos <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {data.recentMovements.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Zap className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground">Aún no hay movimientos</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tus puntos aparecerán aquí cuando tus facturas sean aprobadas.
              </p>
              <Link href="/catalog" className="inline-block mt-4 text-xs font-medium text-primary hover:underline">
                Ver catálogo de premios →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {data.recentMovements.map(m => <MovementRow key={m.id} m={m} />)}
            </ul>
          )}
        </div>
      </section>

    </div>
  )
}
