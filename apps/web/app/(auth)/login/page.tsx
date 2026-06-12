'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const ERROR_MESSAGES: Record<string, string> = {
  'link-expirado':       'Tu enlace de acceso expiró. Solicita uno nuevo.',
  'link-invalido':       'El enlace de acceso no es válido.',
  'cuenta-suspendida':   'Tu cuenta está suspendida. Contacta a Dismant.',
  'registro-cerrado':    'El registro es solo por invitación. Contacta a tu ejecutivo de Dismant.',
  'invitacion-usada':    'Esta invitación ya fue utilizada.',
  'invitacion-expirada': 'Tu invitación expiró. Solicita una nueva a Dismant.',
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
  const [step, setStep]         = useState<'credentials' | 'otp' | 'forgot-email' | 'forgot-otp' | 'forgot-newpw'>('credentials')
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

    if (data.requiresOtp) {
      setStep('otp')
      return
    }

    window.location.href = data.redirectTo
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Código inválido o expirado.')
      return
    }

    const { redirectTo } = await res.json()
    window.location.href = redirectTo
  }

  async function handleResendOtp() {
    setError('')
    setCode('')
    await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
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

  async function handleForgotVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    // Just validate OTP exists — we verify it on the next step with the password reset
    setLoading(false)
    setStep('forgot-newpw')
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
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error al restablecer'); return }
    setStep('credentials')
    setCode(''); setNewPw(''); setConfirmPw('')
    setError('')
    setPassword('')
  }

  if (step === 'forgot-email') {
    return (
      <>
        <h2 className="text-xl font-semibold text-foreground mb-1">Restablecer contraseña</h2>
        <p className="text-muted-foreground text-sm mb-6">Ingresa tu correo y te enviaremos un código de verificación.</p>
        {error && <div className="mb-4 p-3 rounded-lg bg-danger-light text-danger text-sm">{error}</div>}
        <form onSubmit={handleForgotSendOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@empresa.com" required autoFocus className="input-field" />
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
        <h2 className="text-xl font-semibold text-foreground mb-1">Ingresa el código</h2>
        <p className="text-muted-foreground text-sm mb-6">Enviamos un código a <strong>{email}</strong>.</p>
        {error && <div className="mb-4 p-3 rounded-lg bg-danger-light text-danger text-sm">{error}</div>}
        <form onSubmit={e => { e.preventDefault(); setStep('forgot-newpw') }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Código de verificación</label>
            <input type="text" inputMode="numeric" maxLength={6} value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000" required autoFocus
              className="input-field text-center text-2xl tracking-widest font-mono" />
          </div>
          <button type="submit" disabled={code.length !== 6} className="w-full btn-primary">Continuar</button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <button onClick={() => { setStep('forgot-email'); setCode(''); setError('') }} className="text-muted-foreground hover:underline">Volver</button>
          <button onClick={() => handleForgotSendOtp({ preventDefault: () => {} } as React.FormEvent)} className="text-brand-600 hover:underline">Reenviar código</button>
        </div>
      </>
    )
  }

  if (step === 'forgot-newpw') {
    return (
      <>
        <h2 className="text-xl font-semibold text-foreground mb-1">Nueva contraseña</h2>
        <p className="text-muted-foreground text-sm mb-6">Elige una contraseña segura para tu cuenta.</p>
        {error && <div className="mb-4 p-3 rounded-lg bg-danger-light text-danger text-sm">{error}</div>}
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Nueva contraseña</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
              placeholder="Mínimo 8 caracteres" required className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Confirmar contraseña</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              placeholder="Repite tu contraseña" required className="input-field" />
          </div>
          <button type="submit" disabled={loading || !newPw || !confirmPw} className="w-full btn-primary">
            {loading ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>
      </>
    )
  }

  if (step === 'otp') {
    return (
      <>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-50 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Verificación adicional</h2>
            <p className="text-muted-foreground text-sm">
              Enviamos un código a <strong>{email}</strong>
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-4 bg-muted/50 rounded-lg px-3 py-2">
          Es tu primer inicio de sesión o llevas mucho tiempo sin entrar. Verificamos que eres tú.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-danger-light text-danger text-sm">{error}</div>
        )}

        <form onSubmit={handleOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Código de verificación
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              required
              autoFocus
              className="input-field text-center text-2xl tracking-widest font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full btn-primary"
          >
            {loading ? 'Verificando...' : 'Confirmar'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button onClick={() => { setStep('credentials'); setCode(''); setError('') }} className="text-muted-foreground hover:underline">
            Volver
          </button>
          <button onClick={handleResendOtp} className="text-brand-600 hover:underline">
            Reenviar código
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-foreground mb-1">Iniciar sesión</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Ingresa tu correo y contraseña para acceder.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger-light text-danger text-sm">{error}</div>
      )}

      <form onSubmit={handleCredentials} className="space-y-4">
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
            autoFocus
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tu contraseña"
            required
            className="input-field"
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
