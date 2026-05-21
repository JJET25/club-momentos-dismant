'use client'

import { useEffect, useState } from 'react'

interface DashboardData {
  totalMembers:        number
  newMembersThisMonth: number
  pointsInCirculation: number
  pointsRedeemed:      number
  pendingInvoices:     number
  topRewards:          { name: string; count: number }[]
}

function KPICard({ label, value, sub, alert }: {
  label: string; value: string | number; sub?: string; alert?: boolean
}) {
  return (
    <div className={`bg-card rounded-xl border p-6 ${alert ? 'border-amber-300 bg-amber-50/30' : ''}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${alert ? 'text-amber-600' : 'text-foreground'}`}>
        {typeof value === 'number' ? value.toLocaleString('es-MX') : value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminDashboardPage() {
  const [data, setData]     = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/dashboard')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Operativo</h1>
          <p className="text-muted-foreground text-sm mt-1">Visión general del programa de lealtad</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-sm text-primary hover:underline disabled:opacity-50"
        >
          {loading ? 'Actualizando…' : '↻ Actualizar'}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl border p-6 animate-pulse">
              <div className="h-3 bg-muted rounded w-1/2 mb-3" />
              <div className="h-8 bg-muted rounded w-2/3" />
            </div>
          ))
        ) : data ? (
          <>
            <KPICard label="Miembros activos"     value={data.totalMembers} />
            <KPICard label="Nuevos este mes"       value={data.newMembersThisMonth} sub="miembros registrados" />
            <KPICard label="Puntos en circulación" value={data.pointsInCirculation} sub="puntos emitidos netos" />
            <KPICard label="Puntos canjeados"      value={data.pointsRedeemed} sub="histórico acumulado" />
            <KPICard
              label="Facturas pendientes"
              value={data.pendingInvoices}
              sub="requieren revisión"
              alert={data.pendingInvoices > 0}
            />
          </>
        ) : (
          <div className="col-span-3 text-center text-muted-foreground py-8">
            Error al cargar datos.
          </div>
        )}
      </div>

      {/* Top premios del mes */}
      <div className="bg-card rounded-xl border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-foreground">Top premios canjeados este mes</h2>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-6 h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded flex-1" />
                <div className="w-12 h-4 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : !data?.topRewards.length ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Sin canjes registrados este mes.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.topRewards.map((r, i) => (
              <div key={r.name} className="flex items-center gap-4 px-6 py-4">
                <span className="text-sm font-bold text-muted-foreground w-5 text-right shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-foreground flex-1">{r.name}</span>
                <span className="text-sm font-semibold text-primary">
                  {r.count} {r.count === 1 ? 'canje' : 'canjes'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accesos rápidos */}
      {data && data.pendingInvoices > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Tienes {data.pendingInvoices} factura{data.pendingInvoices !== 1 ? 's' : ''} pendiente{data.pendingInvoices !== 1 ? 's' : ''} de revisión
            </p>
            <p className="text-xs text-amber-600 mt-0.5">Los puntos no se acreditan hasta que las apruebes.</p>
          </div>
          <a
            href="/admin/invoices"
            className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors shrink-0"
          >
            Revisar facturas →
          </a>
        </div>
      )}
    </div>
  )
}
