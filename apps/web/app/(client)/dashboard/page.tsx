import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mi Dashboard',
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi Dashboard</h1>
        <p className="text-muted-foreground">Bienvenido a Club Momentos Dismant</p>
      </div>

      {/* Placeholder — se reemplaza con los componentes reales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Puntos disponibles', 'Canjes realizados', 'Facturas validadas'].map((label) => (
          <div key={label} className="bg-card rounded-xl border p-6">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold text-foreground mt-1">—</p>
          </div>
        ))}
      </div>
    </div>
  )
}
