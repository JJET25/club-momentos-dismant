'use client'

import { useState } from 'react'
import Link from 'next/link'

const RIGHTS = [
  { value: 'acceso',        label: 'Acceso',        desc: 'Conocer qué datos personales tenemos sobre ti.' },
  { value: 'rectificacion', label: 'Rectificación',  desc: 'Corregir tus datos cuando sean inexactos o incompletos.' },
  { value: 'cancelacion',   label: 'Cancelación',    desc: 'Solicitar la eliminación de tus datos de nuestros registros.' },
  { value: 'oposicion',     label: 'Oposición',      desc: 'Oponerte al tratamiento de tus datos para ciertos fines.' },
]

export default function ArcoPage() {
  const [right, setRight]               = useState('')
  const [description, setDescription]   = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [folio, setFolio]               = useState('')
  const [error, setError]               = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true); setError('')

    const res = await fetch('/api/client/arco', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ right, description, contactEmail }),
    })

    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) { setError(data.error ?? 'Error al enviar'); return }
    setFolio(data.folio)
  }

  if (folio) {
    return (
      <div className="max-w-lg space-y-6">
        <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Solicitud enviada</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Hemos registrado tu solicitud. Recibirás una respuesta en un plazo máximo de <strong className="text-foreground">20 días hábiles</strong>.
          </p>
          <div className="bg-card border border-border rounded-xl px-6 py-4 inline-block">
            <p className="text-xs text-muted-foreground mb-1">Número de folio</p>
            <p className="font-mono font-bold text-lg text-foreground">{folio}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Guarda este folio como comprobante. También te lo enviamos por correo.
          </p>
        </div>
        <Link href="/profile" className="block text-center text-sm text-primary hover:underline">
          ← Volver a mi perfil
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link href="/profile" className="text-sm text-muted-foreground hover:text-foreground">
          ← Mi Perfil
        </Link>
        <h1 className="text-2xl font-bold text-foreground mt-2">Solicitud de derechos ARCO</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ejerce tus derechos de Acceso, Rectificación, Cancelación u Oposición conforme a la LFPDPPP.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Tipo de derecho */}
        <div>
          <label className="text-sm font-medium text-foreground">Derecho a ejercer *</label>
          <div className="mt-2 space-y-2">
            {RIGHTS.map(r => (
              <label
                key={r.value}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  right === r.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
                }`}
              >
                <input
                  type="radio" name="right" value={r.value} required
                  checked={right === r.value}
                  onChange={() => setRight(r.value)}
                  className="mt-0.5 accent-primary shrink-0"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="text-sm font-medium text-foreground">Descripción de la solicitud *</label>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">
            Describe con detalle qué datos son objeto de tu solicitud y el motivo. Mínimo 20 caracteres.
          </p>
          <textarea
            required minLength={20} rows={5}
            value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Ej. Solicito acceso a todos los datos personales que Club Momentos Dismant tiene almacenados sobre mi persona…"
            className="input-field w-full resize-none text-sm"
          />
          <p className="text-xs text-muted-foreground text-right mt-1">{description.length} caracteres</p>
        </div>

        {/* Correo de contacto */}
        <div>
          <label className="text-sm font-medium text-foreground">Correo de contacto para la respuesta *</label>
          <input
            type="email" required
            value={contactEmail} onChange={e => setContactEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="input-field mt-1 w-full"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
        )}

        <button
          type="submit" disabled={submitting}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
        >
          {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          Enviar solicitud
        </button>

        <p className="text-xs text-muted-foreground text-center">
          Responderemos en un plazo máximo de 20 días hábiles conforme a la LFPDPPP.
        </p>
      </form>
    </div>
  )
}
