import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard Admin',
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard Operativo</h1>
        <p className="text-muted-foreground">Visión general del programa de lealtad</p>
      </div>

      {/* KPIs placeholder */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Miembros activos', value: '—' },
          { label: 'Puntos en circulación', value: '—' },
          { label: 'Puntos canjeados', value: '—' },
          { label: 'Premios ejercidos', value: '—' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card rounded-xl border p-6">
            <p className="text-sm text-muted-foreground">{kpi.label}</p>
            <p className="text-3xl font-bold text-foreground mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
