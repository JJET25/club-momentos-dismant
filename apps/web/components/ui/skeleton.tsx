import { cn } from '@/lib/utils'

/**
 * Esqueletos de carga: muestran la forma de la pantalla mientras llegan los
 * datos, en lugar de un spinner o un "Cargando…". La animación se desactiva
 * si el sistema pide reducir movimiento (regla global en globals.css).
 */

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden="true" className={cn('rounded-md bg-muted animate-pulse', className)} style={style} />
}

/** Contenedor accesible: avisa a lectores de pantalla que el contenido está cargando. */
export function SkeletonRegion({ label = 'Cargando…', className, children }: {
  label?: string; className?: string; children: React.ReactNode
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

/** Título y subtítulo de una pantalla, con un botón opcional a la derecha. */
export function SkeletonPageHeader({ action = false }: { action?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2.5">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {action && <Skeleton className="h-10 w-36 rounded-lg" />}
    </div>
  )
}

/** Fila de tarjetas de indicador (saldo, totales…). */
export function SkeletonStatCards({ count = 3 }: { count?: number }) {
  return (
    <div className={cn('grid gap-4 grid-cols-1 sm:grid-cols-2', count >= 3 && 'lg:grid-cols-3', count >= 4 && 'xl:grid-cols-4')}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-card border rounded-xl p-5 flex items-center gap-4">
          <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Tabla con encabezado y filas. */
export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="flex gap-4 px-5 py-3.5 border-b bg-muted/30">
        {Array.from({ length: cols }, (_, j) => <Skeleton key={j} className="h-3 flex-1" />)}
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex gap-4 px-5 py-4 items-center">
            {Array.from({ length: cols }, (_, j) => (
              <Skeleton key={j} className={cn('h-4 flex-1', j === 0 && 'max-w-[30%]')} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Lista de elementos con ícono, dos líneas y un valor a la derecha. */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-card border rounded-xl divide-y">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  )
}

/** Cuadrícula de tarjetas con imagen (catálogo, promociones). */
export function SkeletonCardGrid({ count = 6, imageClass = 'aspect-video' }: { count?: number; imageClass?: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-card border rounded-2xl overflow-hidden">
          <Skeleton className={cn('rounded-none', imageClass)} />
          <div className="p-4 space-y-2.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-8 w-full rounded-lg mt-2" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Gráfica con título. */
export function SkeletonChart({ height = 'h-64' }: { height?: string }) {
  return (
    <div className="bg-card border rounded-xl p-5 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className={cn('flex items-end gap-3', height)}>
        {[45, 70, 35, 85, 55, 65, 40, 75].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-t-md rounded-b-none" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  )
}

/** Tarjeta grande destacada (saldo del portal). */
export function SkeletonHero() {
  return (
    <div className="rounded-2xl border bg-card p-8 space-y-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-14 w-40" />
    </div>
  )
}

/** Formulario con etiquetas y campos. */
export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <div className="bg-card border rounded-xl p-6 space-y-5 max-w-xl">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
  )
}
