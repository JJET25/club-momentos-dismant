import {
  SkeletonRegion, SkeletonPageHeader, SkeletonStatCards, SkeletonTable, SkeletonList,
  SkeletonCardGrid, SkeletonChart, SkeletonHero, SkeletonForm, Skeleton,
} from '@/components/ui/skeleton'

// Esqueleto de cada pantalla: la misma forma que la pantalla cargada, para
// que nada "salte" cuando llegan los datos. Se usan en los loading.tsx de
// cada ruta (al navegar) y dentro de las páginas mientras cargan sus datos.

// ── Portal del miembro ──────────────────────────────────────

export function StatementSkeleton() {
  return (
    <SkeletonRegion label="Cargando estado de cuenta…" className="space-y-6">
      <SkeletonPageHeader action />
      <SkeletonHero />
      <SkeletonStatCards count={3} />
      <SkeletonChart />
      <SkeletonList rows={5} />
    </SkeletonRegion>
  )
}

export function CatalogSkeleton() {
  return (
    <SkeletonRegion label="Cargando catálogo…" className="space-y-6">
      <SkeletonPageHeader action />
      <div className="flex gap-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-24 rounded-full" />)}</div>
      <SkeletonCardGrid count={6} />
    </SkeletonRegion>
  )
}

export function PromotionsSkeleton() {
  return (
    <SkeletonRegion label="Cargando promociones…" className="space-y-6">
      <SkeletonPageHeader />
      <SkeletonCardGrid count={6} imageClass="aspect-[2/1]" />
    </SkeletonRegion>
  )
}

export function MemberInvoicesSkeleton() {
  return (
    <SkeletonRegion label="Cargando facturas…" className="space-y-6">
      <SkeletonPageHeader />
      <Skeleton className="h-12 w-full rounded-xl" />
      <SkeletonList rows={5} />
    </SkeletonRegion>
  )
}

export function MemberRedemptionsSkeleton() {
  return (
    <SkeletonRegion label="Cargando canjes…" className="space-y-6">
      <SkeletonPageHeader />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
      </div>
    </SkeletonRegion>
  )
}

export function ProfileSkeleton() {
  return (
    <SkeletonRegion label="Cargando perfil…" className="space-y-6">
      <SkeletonPageHeader />
      <SkeletonForm fields={5} />
    </SkeletonRegion>
  )
}

// ── Panel de administración ─────────────────────────────────

/** Pantalla de lista del panel: encabezado, filtros y tabla. */
export function AdminTableSkeleton({ cols = 6, filters = 3, action = true, label = 'Cargando…' }: {
  cols?: number; filters?: number; action?: boolean; label?: string
}) {
  return (
    <SkeletonRegion label={label} className="space-y-6">
      <SkeletonPageHeader action={action} />
      {filters > 0 && (
        <div className="flex gap-3 flex-wrap">
          <Skeleton className="h-10 w-72 rounded-lg" />
          {Array.from({ length: filters - 1 }, (_, i) => <Skeleton key={i} className="h-10 w-40 rounded-lg" />)}
        </div>
      )}
      <SkeletonTable rows={7} cols={cols} />
    </SkeletonRegion>
  )
}

export function AdminCardsSkeleton({ label = 'Cargando…', imageClass }: { label?: string; imageClass?: string }) {
  return (
    <SkeletonRegion label={label} className="space-y-6">
      <SkeletonPageHeader action />
      <div className="flex gap-3"><Skeleton className="h-10 w-72 rounded-lg" /><Skeleton className="h-10 w-40 rounded-lg" /></div>
      <SkeletonCardGrid count={6} imageClass={imageClass} />
    </SkeletonRegion>
  )
}

export function ReportsSkeleton() {
  return (
    <SkeletonRegion label="Cargando reportes…" className="space-y-6">
      <SkeletonPageHeader action />
      <div className="flex gap-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-9 w-28 rounded-lg" />)}</div>
      <ReportBodySkeleton />
    </SkeletonRegion>
  )
}

/** Cuerpo de un reporte (indicadores + gráfica), para cuando cambia el periodo. */
export function ReportBodySkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <SkeletonStatCards count={4} />
      <SkeletonChart height="h-72" />
    </div>
  )
}

export function AdminFormSkeleton({ label = 'Cargando…' }: { label?: string }) {
  return (
    <SkeletonRegion label={label} className="space-y-6">
      <SkeletonPageHeader />
      <SkeletonList rows={4} />
    </SkeletonRegion>
  )
}
