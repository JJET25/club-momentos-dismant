'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const ERROR_MESSAGES: Record<string, string> = {
  'link-expirado': 'Tu enlace de acceso expiró. Solicita uno nuevo.',
  'link-invalido': 'El enlace de acceso no es válido.',
  'cuenta-suspendida': 'Tu cuenta está suspendida. Contacta a Dismant.',
  'registro-cerrado': 'El registro es solo por invitación. Contacta a tu ejecutivo de Dismant.',
  'invitacion-usada': 'Esta invitación ya fue utilizada.',
  'invitacion-expirada': 'Tu invitación expiró. Solicita una nueva a Dismant.',
  'invitacion-invalida': 'El enlace de invitación no es válido.',
}

function LoginForm() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(urlError ? (ERROR_MESSAGES[urlError] ?? '') : '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    setLoading(false)

    if (!res.ok) {
      setError('Ocurrió un error. Intenta de nuevo.')
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Revisa tu correo</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Te enviamos un enlace de acceso a <strong>{email}</strong>. Expira en 15 minutos.
        </p>
        <button
          onClick={() => { setSent(false); setEmail('') }}
          className="text-sm text-brand-600 hover:underline"
        >
          Usar otro correo
        </button>
      </div>
    )
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-foreground mb-1">Iniciar sesión</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Ingresa tu correo y te enviaremos un enlace de acceso.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger-light text-danger text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Correo electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@empresa.com"
            required
            className="input-field"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !email}
          className="w-full btn-primary"
        >
          {loading ? 'Enviando...' : 'Iniciar sesión'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground">
          El acceso al club es por invitación. Contacta a tu ejecutivo de Dismant.
        </p>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 to-brand-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
            <span className="text-2xl font-bold text-white">D</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Club Momentos Dismant</h1>
          <p className="text-brand-300 mt-1">Ingresa a tu cuenta de lealtad</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <Suspense fallback={<div className="animate-pulse h-32 bg-gray-50 rounded-lg" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
