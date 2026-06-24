'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const ERROR_MESSAGES: Record<string, string> = {
  'link-expirado':       'Tu enlace de acceso expiró. Solicita uno nuevo.',
  'link-invalido':       'El enlace de acceso no es válido.',
  'cuenta-suspendida':   'Tu cuenta está suspendida. Contacta a tu ejecutivo.',
  'registro-cerrado':    'El registro es solo por invitación. Contacta a tu ejecutivo.',
  'invitacion-usada':    'Esta invitación ya fue utilizada.',
  'invitacion-expirada': 'Tu invitación expiró. Solicita una nueva a tu ejecutivo.',
  'invitacion-invalida': 'El enlace de invitación no es válido.',
}

function LoginForm() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode]         = useState('')
  const [newPw, setNewPw]       = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [step, setStep]         = useState<'credentials' | 'forgot-email' | 'forgot-otp' | 'forgot-newpw'>('credentials')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(urlError ? (ERROR_MESSAGES[urlError] ?? '') : '')

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Ocurrió un error. Intenta de nuevo.')
      return
    }

    if (data.noPassword) {
      setError('Esta cuenta no tiene contraseña configurada. Usa "¿Olvidaste tu contraseña?" para establecerla.')
      return
    }

    window.location.href = data.redirectTo
  }

  async function handleForgotSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    setStep('forgot-otp')
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPw !== confirmPw) { setError('Las contraseñas no coinciden'); return }
    if (newPw.length < 8)   { setError('Mínimo 8 caracteres'); return }
    setError(''); setLoading(true)
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp: code, newPassword: newPw }),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json()
      const msg = d.error ?? 'Error al restablecer'
      // Si el OTP es inválido o expiró, regresar al paso de código
      if (msg.includes('Código') || msg.includes('expirad')) {
        setCode('')
        setNewPw('')
        setConfirmPw('')
        setStep('forgot-otp')
      }
      setError(msg)
      return
    }
    setStep('credentials')
    setCode(''); setNewPw(''); setConfirmPw('')
    setError('')
    setPassword('')
  }

  if (step === 'forgot-email') {
    return (
      <>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Restablecer contraseña</h2>
        <p className="text-gray-500 text-sm mb-6">Ingresa tu correo y te enviaremos un código de verificación.</p>
        {error && <div className="mb-4 p-3 rounded-lg bg-danger-light text-danger text-sm">{error}</div>}
        <form onSubmit={handleForgotSendOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@empresa.com" required autoFocus className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow" />
          </div>
          <button type="submit" disabled={loading || !email} className="w-full btn-primary">
            {loading ? 'Enviando…' : 'Enviar código'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <button onClick={() => { setStep('credentials'); setError('') }} className="text-sm text-brand-600 hover:underline">
            Volver al inicio de sesión
          </button>
        </div>
      </>
    )
  }

  if (step === 'forgot-otp') {
    return (
      <>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Ingresa el código</h2>
        <p className="text-gray-500 text-sm mb-6">Enviamos un código a <strong>{email}</strong>.</p>
        {error && <div className="mb-4 p-3 rounded-lg bg-danger-light text-danger text-sm">{error}</div>}
        <form onSubmit={e => { e.preventDefault(); setStep('forgot-newpw') }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">Código de verificación</label>
            <input type="text" inputMode="numeric" maxLength={6} value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000" required autoFocus
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow text-center text-2xl tracking-widest font-mono" />
          </div>
          <button type="submit" disabled={code.length !== 6} className="w-full btn-primary">Continuar</button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <button onClick={() => { setStep('forgot-email'); setCode(''); setError('') }} className="text-gray-500 hover:underline">Volver</button>
          <button onClick={() => handleForgotSendOtp({ preventDefault: () => {} } as React.FormEvent)} className="text-brand-600 hover:underline">Reenviar código</button>
        </div>
      </>
    )
  }

  if (step === 'forgot-newpw') {
    return (
      <>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Nueva contraseña</h2>
        <p className="text-gray-500 text-sm mb-6">Elige una contraseña segura para tu cuenta.</p>
        {error && <div className="mb-4 p-3 rounded-lg bg-danger-light text-danger text-sm">{error}</div>}
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">Nueva contraseña</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
              placeholder="Mínimo 8 caracteres" required className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">Confirmar contraseña</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              placeholder="Repite tu contraseña" required className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow" />
          </div>
          <button type="submit" disabled={loading || !newPw || !confirmPw} className="w-full btn-primary">
            {loading ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>
      </>
    )
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Iniciar sesión</h2>
      <p className="text-gray-500 text-sm mb-6">
        Ingresa tu correo y contraseña para acceder.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger-light text-danger text-sm">{error}</div>
      )}

      <form onSubmit={handleCredentials} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1.5">
            Correo electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@empresa.com"
            required
            autoFocus
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1.5">
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tu contraseña"
            required
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full btn-primary"
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button onClick={() => { setStep('forgot-email'); setError('') }}
          className="text-sm text-brand-600 hover:underline">
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          El acceso al club es por invitación. Contacta a tu ejecutivo.
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
            <span className="text-2xl font-bold text-white">CM</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Club Momentos</h1>
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
