'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isValidRFC } from '@/lib/utils'
import { MEXICAN_STATES } from '@dismant/types'

// ── Tipos ────────────────────────────────────────────────────

interface FormData {
  fullName: string
  email: string
  companyName: string
  rfc: string
  invitationCode: string
  locationState: string
  locationCity: string
  acceptTerms: boolean
  acceptPrivacy: boolean
}

// ── Componente de barra de progreso ──────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-8">
      <div className="flex justify-between text-xs text-muted-foreground mb-2">
        <span>Paso {step} de {total}</span>
        <span>{Math.round((step / total) * 100)}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full">
        <div
          className="h-1.5 bg-brand-600 rounded-full transition-all duration-300"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </div>
  )
}

// ── Paso 1: Datos personales ─────────────────────────────────

function Step1({
  data,
  onChange,
  onNext,
}: {
  data: FormData
  onChange: (field: keyof FormData, value: string) => void
  onNext: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  async function validate() {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    if (!data.fullName.trim()) newErrors.fullName = 'Campo obligatorio'
    if (!data.email.trim()) newErrors.email = 'Campo obligatorio'
    if (!data.companyName.trim()) newErrors.companyName = 'Campo obligatorio'
    if (!data.rfc.trim()) {
      newErrors.rfc = 'Campo obligatorio'
    } else if (!isValidRFC(data.rfc.toUpperCase())) {
      newErrors.rfc = 'Formato de RFC inválido'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return false
    }

    setLoading(true)

    // Verificar email único
    const emailRes = await fetch('/api/auth/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email }),
    })
    const { exists: emailExists } = await emailRes.json()
    if (emailExists) {
      setErrors({ email: 'Ya existe una cuenta con este correo. ¿Olvidaste cómo ingresar?' })
      setLoading(false)
      return false
    }

    // Verificar RFC único
    const rfcRes = await fetch('/api/auth/check-rfc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rfc: data.rfc }),
    })
    const { exists: rfcExists } = await rfcRes.json()
    if (rfcExists) {
      setErrors({ rfc: 'Este RFC ya tiene una cuenta registrada' })
      setLoading(false)
      return false
    }

    setLoading(false)
    return true
  }

  async function handleNext() {
    const valid = await validate()
    if (valid) onNext()
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Nombre completo *</label>
        <input
          type="text"
          value={data.fullName}
          onChange={(e) => onChange('fullName', e.target.value)}
          placeholder="Juan García López"
          className="input-field"
        />
        {errors.fullName && <p className="text-danger text-xs mt-1">{errors.fullName}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Correo electrónico *</label>
        <input
          type="email"
          value={data.email}
          onChange={(e) => onChange('email', e.target.value)}
          placeholder="juan@empresa.com"
          className="input-field"
        />
        {errors.email && <p className="text-danger text-xs mt-1">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Empresa *</label>
        <input
          type="text"
          value={data.companyName}
          onChange={(e) => onChange('companyName', e.target.value)}
          placeholder="Empresa S.A. de C.V."
          className="input-field"
        />
        {errors.companyName && <p className="text-danger text-xs mt-1">{errors.companyName}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">RFC *</label>
        <input
          type="text"
          value={data.rfc}
          onChange={(e) => onChange('rfc', e.target.value.toUpperCase())}
          placeholder="EMP900101AAA"
          maxLength={13}
          className="input-field font-mono"
        />
        {errors.rfc && <p className="text-danger text-xs mt-1">{errors.rfc}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Código de invitación <span className="text-muted-foreground font-normal">(opcional)</span>
        </label>
        <input
          type="text"
          value={data.invitationCode}
          onChange={(e) => onChange('invitationCode', e.target.value)}
          placeholder="DISMANT2026"
          className="input-field"
        />
      </div>

      <button
        onClick={handleNext}
        disabled={loading}
        className="w-full btn-primary mt-2"
      >
        {loading ? 'Verificando...' : 'Continuar'}
      </button>
    </div>
  )
}

// ── Paso 2: Verificación OTP ─────────────────────────────────

function Step2({
  email,
  name,
  onNext,
}: {
  email: string
  name: string
  onNext: () => void
}) {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  // Enviar OTP al montar el componente
  useEffect(() => {
    fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    })
  }, [email, name])

  // Cuenta regresiva para reenvío
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  function handleInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)
    if (value && index < 5) inputs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  async function handleVerify() {
    const fullCode = code.join('')
    if (fullCode.length < 6) { setError('Ingresa los 6 dígitos'); return }
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code: fullCode }),
    })

    setLoading(false)
    if (!res.ok) {
      const { error: msg } = await res.json()
      setError(msg ?? 'Código inválido o expirado')
      setCode(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
      return
    }

    onNext()
  }

  async function handleResend() {
    setCanResend(false)
    setCountdown(60)
    setCode(['', '', '', '', '', ''])
    setError('')
    await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    })
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-6">
        Enviamos un código de 6 dígitos a <strong>{email}</strong>. Expira en 10 minutos.
      </p>

      <div className="flex gap-2 justify-center mb-4">
        {code.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleInput(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-11 h-13 text-center text-xl font-bold border-2 border-input rounded-lg focus:outline-none focus:border-brand-600 transition-colors"
          />
        ))}
      </div>

      {error && <p className="text-danger text-sm text-center mb-4">{error}</p>}

      <button onClick={handleVerify} disabled={loading} className="w-full btn-primary mb-4">
        {loading ? 'Verificando...' : 'Verificar código'}
      </button>

      <div className="text-center text-sm text-muted-foreground">
        {canResend ? (
          <button onClick={handleResend} className="text-brand-600 hover:underline">
            Reenviar código
          </button>
        ) : (
          <span>Reenviar en {countdown}s</span>
        )}
      </div>
    </div>
  )
}

// ── Paso 3: Ubicación y términos ─────────────────────────────

function Step3({
  data,
  onChange,
  onNext,
  loading,
}: {
  data: FormData
  onChange: (field: keyof FormData, value: string | boolean) => void
  onNext: () => void
  loading: boolean
}) {
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  function validate() {
    const e: Partial<Record<keyof FormData, string>> = {}
    if (!data.locationState) e.locationState = 'Selecciona tu estado'
    if (!data.locationCity.trim()) e.locationCity = 'Ingresa tu ciudad'
    if (!data.acceptTerms) e.acceptTerms = 'Debes aceptar los Términos y Condiciones'
    if (!data.acceptPrivacy) e.acceptPrivacy = 'Debes aceptar el Aviso de Privacidad'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleNext() {
    if (validate()) onNext()
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Estado *</label>
        <select
          value={data.locationState}
          onChange={(e) => onChange('locationState', e.target.value)}
          className="input-field"
        >
          <option value="">Selecciona tu estado</option>
          {MEXICAN_STATES.map((state) => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>
        {errors.locationState && <p className="text-danger text-xs mt-1">{errors.locationState}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Ciudad *</label>
        <input
          type="text"
          value={data.locationCity}
          onChange={(e) => onChange('locationCity', e.target.value)}
          placeholder="Monterrey"
          className="input-field"
        />
        {errors.locationCity && <p className="text-danger text-xs mt-1">{errors.locationCity}</p>}
      </div>

      <div className="space-y-3 pt-2">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.acceptTerms}
            onChange={(e) => onChange('acceptTerms', e.target.checked)}
            className="mt-0.5 rounded border-input text-brand-600"
          />
          <span className="text-sm text-foreground">
            Acepto los{' '}
            <a href="#" className="text-brand-600 hover:underline">Términos y Condiciones</a>
            {' '}del programa Club Momentos Dismant *
          </span>
        </label>
        {errors.acceptTerms && <p className="text-danger text-xs">{errors.acceptTerms}</p>}

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.acceptPrivacy}
            onChange={(e) => onChange('acceptPrivacy', e.target.checked)}
            className="mt-0.5 rounded border-input text-brand-600"
          />
          <span className="text-sm text-foreground">
            He leído y acepto el{' '}
            <a href="#" className="text-brand-600 hover:underline">Aviso de Privacidad</a> *
          </span>
        </label>
        {errors.acceptPrivacy && <p className="text-danger text-xs">{errors.acceptPrivacy}</p>}
      </div>

      <button onClick={handleNext} disabled={loading} className="w-full btn-primary mt-2">
        {loading ? 'Creando tu cuenta...' : 'Finalizar registro'}
      </button>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    companyName: '',
    rfc: '',
    invitationCode: '',
    locationState: '',
    locationCity: '',
    acceptTerms: false,
    acceptPrivacy: false,
  })

  function handleChange(field: keyof FormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleRegister() {
    setRegistering(true)
    setError('')

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.email,
        fullName: formData.fullName,
        companyName: formData.companyName,
        rfc: formData.rfc,
        locationState: formData.locationState,
        locationCity: formData.locationCity,
        invitationCode: formData.invitationCode,
      }),
    })

    setRegistering(false)

    if (!res.ok) {
      const { error: msg } = await res.json()
      setError(msg ?? 'Ocurrió un error. Intenta de nuevo.')
      return
    }

    router.push('/welcome')
  }

  const titles = [
    'Crea tu cuenta',
    'Verifica tu correo',
    'Configura tu perfil',
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 to-brand-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
            <span className="text-2xl font-bold text-white">D</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Club Momentos Dismant</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <ProgressBar step={step} total={3} />

          <h2 className="text-xl font-semibold text-foreground mb-1">{titles[step - 1]}</h2>
          {step === 1 && (
            <p className="text-muted-foreground text-sm mb-6">
              Ingresa tus datos para unirte al programa.
            </p>
          )}
          {step === 2 && (
            <p className="text-muted-foreground text-sm mb-6">
              Confirmamos que el correo es tuyo.
            </p>
          )}
          {step === 3 && (
            <p className="text-muted-foreground text-sm mb-6">
              Último paso. Cuéntanos dónde estás.
            </p>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-danger-light text-danger text-sm">{error}</div>
          )}

          {step === 1 && (
            <Step1 data={formData} onChange={handleChange} onNext={() => setStep(2)} />
          )}
          {step === 2 && (
            <Step2 email={formData.email} name={formData.fullName} onNext={() => setStep(3)} />
          )}
          {step === 3 && (
            <Step3
              data={formData}
              onChange={handleChange}
              onNext={handleRegister}
              loading={registering}
            />
          )}

          <div className="mt-6 text-center">
            <span className="text-sm text-muted-foreground">¿Ya tienes cuenta? </span>
            <Link href="/login" className="text-sm text-brand-600 font-medium hover:underline">
              Ingresa aquí
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
