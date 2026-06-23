'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { getBrand } from '@/lib/brand'

interface Entry {
  id:           string
  type:         string
  points:       number
  balance_after: number
  description:  string | null
  created_at:   string
  expires_at:   string | null
}

interface StatementData {
  entries:        Entry[]
  member:         { full_name: string; rfc: string; company_name: string; email: string; affiliate?: string }
  balance:        number
  periodLabel:    string
  generatedAt:    string
}

const TYPE_LABELS: Record<string, string> = {
  invoice:       'Factura validada',
  redemption:    'Canje de premio',
  welcome_bonus: 'Bono de bienvenida',
  review_bonus:  'Bono por reseña',
  adjustment:    'Ajuste manual',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatementPDFContent() {
  const params     = useSearchParams()
  const [data, setData] = useState<StatementData | null>(null)
  const [error, setError] = useState('')
  const printed    = useRef(false)

  const from  = params.get('from')  ?? ''
  const to    = params.get('to')    ?? ''
  const month = params.get('month') ?? ''

  useEffect(() => {
    const q = new URLSearchParams()
    if (from) q.set('from', from)
    if (to)   q.set('to', to)

    Promise.all([
      fetch(`/api/client/statement?${q}`).then(r => r.ok ? r.json() : Promise.reject(r)),
      fetch('/api/client/profile').then(r => r.ok ? r.json() : Promise.reject(r)),
    ])
      .then(([stmt, prof]) => {
        const label = from && to
          ? `${fmtDate(from)} — ${fmtDate(to)}`
          : 'Todos los movimientos'

        setData({
          entries:     stmt.entries,
          member:      { ...prof.profile, affiliate: prof.profile.affiliate },
          balance:     stmt.balance,
          periodLabel: label,
          generatedAt: new Date().toLocaleString('es-MX'),
        })
      })
      .catch(() => setError('No se pudo cargar el estado de cuenta.'))
  }, [from, to, month])

  useEffect(() => {
    if (data && !printed.current) {
      printed.current = true
      document.title = `estado-cuenta-${data.member.rfc}-${month || new Date().toISOString().slice(0,7)}`
      setTimeout(() => window.print(), 300)
    }
  }, [data, month])

  if (error) return <p className="p-8 text-red-600">{error}</p>
  if (!data)  return <p className="p-8 text-gray-500">Generando estado de cuenta…</p>

  const initialBalance = data.entries.length > 0
    ? data.entries[data.entries.length - 1].balance_after - data.entries[data.entries.length - 1].points
    : data.balance

  const brand = getBrand(data.member.affiliate)

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans text-sm" style={{ padding: '40px 48px' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: '#2563eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 16,
            }}>{brand.initial}</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>{brand.name}</p>
              <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>Estado de Cuenta de Puntos</p>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontWeight: 600, margin: 0 }}>Período: {data.periodLabel}</p>
          <p style={{ color: '#6b7280', fontSize: 11, margin: '4px 0 0' }}>Generado: {data.generatedAt}</p>
        </div>
      </div>

      {/* Datos del miembro */}
      <div style={{ background: '#f9fafb', borderRadius: 8, padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            ['Nombre',  data.member.full_name],
            ['RFC',     data.member.rfc],
            ['Empresa', data.member.company_name],
            ['Correo',  data.member.email],
          ].map(([label, value]) => (
            <div key={label}>
              <span style={{ color: '#6b7280', fontSize: 11 }}>{label}: </span>
              <span style={{ fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Saldo inicial del período', value: `${initialBalance.toLocaleString('es-MX')} pts` },
          { label: 'Saldo final del período',   value: `${data.balance.toLocaleString('es-MX')} pts` },
          { label: 'Total de movimientos',      value: data.entries.length },
        ].map(card => (
          <div key={card.label} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px' }}>
            <p style={{ color: '#6b7280', fontSize: 11, margin: '0 0 4px' }}>{card.label}</p>
            <p style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            {['Fecha', 'Tipo', 'Descripción', 'Puntos', 'Saldo'].map(h => (
              <th key={h} style={{
                padding: '8px 12px', textAlign: h === 'Puntos' || h === 'Saldo' ? 'right' : 'left',
                fontSize: 11, fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.entries.map((e, i) => (
            <tr key={e.id} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
              <td style={{ padding: '8px 12px', fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>
                {fmtDate(e.created_at)}
              </td>
              <td style={{ padding: '8px 12px', fontSize: 11 }}>
                {TYPE_LABELS[e.type] ?? e.type}
              </td>
              <td style={{ padding: '8px 12px', fontSize: 11, color: '#6b7280' }}>
                {e.description ?? '—'}
              </td>
              <td style={{
                padding: '8px 12px', fontSize: 11, textAlign: 'right',
                fontWeight: 600, color: e.points > 0 ? '#16a34a' : '#dc2626',
              }}>
                {e.points > 0 ? '+' : ''}{e.points.toLocaleString('es-MX')}
              </td>
              <td style={{ padding: '8px 12px', fontSize: 11, textAlign: 'right', fontWeight: 500 }}>
                {e.balance_after.toLocaleString('es-MX')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.entries.length === 0 && (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: '32px 0' }}>
          Sin movimientos en el período seleccionado.
        </p>
      )}

      {/* Pie */}
      <div style={{ marginTop: 32, borderTop: '1px solid #e5e7eb', paddingTop: 16, color: '#9ca3af', fontSize: 10 }}>
        <p style={{ margin: 0 }}>{brand.name} — Documento generado automáticamente. Los puntos tienen trazabilidad completa ante cada movimiento.</p>
      </div>

      <style>{`@media print { @page { margin: 20mm; } body { print-color-adjust: exact; } }`}</style>
    </div>
  )
}

export default function StatementPDFPage() {
  return <StatementPDFContent />
}
