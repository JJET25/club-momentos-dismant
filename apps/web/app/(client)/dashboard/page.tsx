'use client'

import { useEffect, useState } from 'react'

interface Movement {
  id: string
  type: string
  points: number
  balance_after: number
  description: string | null
  created_at: string
  expires_at: string | null
}

interface DashboardData {
  currentBalance: number
  pointsThisMonth: number
  pointsRedeemed: number
  invoicesApproved: number
  recentMovements: Movement[]
  expiring: { points: number; date: string } | null
}

const MOVEMENT_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  invoice:       { label: 'Factura',        icon: '📄', color: 'text-green-600' },
  redemption:    { label: 'Canje',          icon: '🎁', color: 'text-orange-600' },
  welcome_bonus: { label: 'Bono bienvenida',icon: '🎉', color: 'text-blue-600' },
  review_bonus:  { label: 'Bono reseña',    icon: '⭐', color: 'text-yellow-600' },
  adjustment:    { label: 'Ajuste',         icon: '🔧', color: 'text-gray-600' },
}

function formatPoints(n: number) {
  return n.toLocaleString('es-MX')
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/client/dashboard')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-muted rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
        </div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">

      {/* Alerta de puntos próximos a vencer */}
      {data.expiring && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <span className="text-xl">⚠️</span>
          <p className="text-sm text-amber-800">
            Tienes <strong>{formatPoints(data.expiring.points)} puntos</strong> que vencen
            el <strong>{formatDate(data.expiring.date)}</strong>. ¡Canjéalos antes de que expiren!
          </p>
        </div>
      )}

      {/* Saldo principal */}
      <div className="bg-gradient-to-br from-brand-700 to-brand-900 rounded-2xl p-8 text-white">
        <p className="text-sm font-medium text-brand-200 mb-1">Puntos disponibles</p>
        <p className="text-6xl font-bold tracking-tight">{formatPoints(data.currentBalance)}</p>
        <p className="text-brand-300 text-sm mt-2">pts</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">Ganados este mes</p>
          <p className="text-3xl font-bold text-foreground mt-1">
            +{formatPoints(data.pointsThisMonth)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">puntos</p>
        </div>
        <div className="bg-card rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">Canjeados (histórico)</p>
          <p className="text-3xl font-bold text-foreground mt-1">
            {formatPoints(data.pointsRedeemed)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">puntos</p>
        </div>
        <div className="bg-card rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">Facturas validadas</p>
          <p className="text-3xl font-bold text-foreground mt-1">{data.invoicesApproved}</p>
          <p className="text-xs text-muted-foreground mt-1">facturas</p>
        </div>
      </div>

      {/* Últimos movimientos */}
      <div className="bg-card rounded-xl border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-foreground">Últimos movimientos</h2>
        </div>

        {data.recentMovements.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Aún no hay movimientos en tu cuenta.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data.recentMovements.map((m) => {
              const config = MOVEMENT_CONFIG[m.type] ?? { label: m.type, icon: '•', color: 'text-foreground' }
              const isPositive = m.points > 0
              return (
                <li key={m.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-lg flex-shrink-0">
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{config.label}</p>
                    {m.description && (
                      <p className="text-xs text-muted-foreground truncate">{m.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{formatDate(m.created_at)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''}{formatPoints(m.points)} pts
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Saldo: {formatPoints(m.balance_after)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

    </div>
  )
}
