'use client'

import { useState, useEffect } from 'react'
import { Copy, Check } from 'lucide-react'

type Affiliate = 'dismant' | 'lauti'

const AFFILIATE_OPTIONS: { value: Affiliate; label: string; color: string }[] = [
  { value: 'dismant', label: 'Dismant',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'lauti',   label: 'Lauti',    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
]

interface Invitation {
  id: string
  email: string
  affiliate: string
  used: boolean
  used_at: string | null
  expires_at: string
  created_at: string
}

function StatusBadge({ invitation }: { invitation: Invitation }) {
  if (invitation.used) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        Usada
      </span>
    )
  }
  if (new Date(invitation.expires_at) < new Date()) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        Expirada
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
      Pendiente
    </span>
  )
}

export default function InvitationsPage() {
  const [email, setEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [affiliate, setAffiliate] = useState<Affiliate>('dismant')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loadingList, setLoadingList] = useState(true)

  async function loadInvitations() {
    setLoadingList(true)
    const res = await fetch('/api/admin/invitations')
    if (res.ok) {
      const { invitations: data } = await res.json()
      setInvitations(data ?? [])
    }
    setLoadingList(false)
  }

  useEffect(() => {
    loadInvitations()
  }, [])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setSending(true)
    setError('')
    setSuccess('')

    const res = await fetch('/api/admin/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), recipientName: recipientName.trim() || undefined, affiliate }),
    })

    setSending(false)

    if (!res.ok) {
      const { error: msg } = await res.json()
      setError(msg ?? 'No se pudo enviar la invitación')
      return
    }

    const data = await res.json()
    setSuccess(`Invitación enviada a ${email.trim()}`)
    setLastInviteLink(data.inviteLink ?? null)
    setCopied(false)
    setEmail('')
    setRecipientName('')
    setAffiliate('dismant')
    loadInvitations()
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Invitaciones</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Envía invitaciones por correo para que nuevos clientes puedan registrarse.
        </p>
      </div>

      {/* Formulario de nueva invitación */}
      <div className="bg-card rounded-xl border border-border p-6 mb-8">
        <h2 className="text-base font-semibold text-foreground mb-4">Nueva invitación</h2>

        {success && (
          <div className="mb-4 space-y-3">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm">
              {success}
            </div>
            {lastInviteLink && (
              <div className="p-3 rounded-lg bg-muted border border-border">
                <p className="text-xs text-muted-foreground mb-2 font-medium">
                  Link de registro (cópialo si no se envía por email):
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-foreground bg-background border border-border rounded px-2 py-1.5 overflow-x-auto whitespace-nowrap select-all">
                    {lastInviteLink}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(lastInviteLink)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        <form onSubmit={handleSend} className="space-y-4">
          {/* Empresa afiliada */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Empresa afiliada *
            </label>
            <div className="flex gap-3">
              {AFFILIATE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAffiliate(opt.value)}
                  className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                    affiliate === opt.value
                      ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 dark:border-brand-500'
                      : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Correo electrónico *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@empresa.com"
                required
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Nombre del destinatario <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Juan García"
                className="input-field"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={sending || !email.trim()} className="btn-primary">
              {sending ? 'Enviando...' : 'Enviar invitación'}
            </button>
            <p className="text-xs text-muted-foreground">
              El enlace expira en 7 días y solo puede usarse una vez.
            </p>
          </div>
        </form>
      </div>

      {/* Listado de invitaciones */}
      <div className="bg-card rounded-xl border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Historial de invitaciones</h2>
        </div>

        {loadingList ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Cargando...</div>
        ) : invitations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Aún no hay invitaciones enviadas.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wide">
                <th className="px-6 py-3 font-medium">Correo</th>
                <th className="px-6 py-3 font-medium">Empresa</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium">Enviada</th>
                <th className="px-6 py-3 font-medium">Expira</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invitations.map((inv) => (
                <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">{inv.email}</td>
                  <td className="px-6 py-4">
                    {(() => {
                      const opt = AFFILIATE_OPTIONS.find(o => o.value === inv.affiliate)
                      return (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${opt?.color ?? 'bg-gray-100 text-gray-600'}`}>
                          {opt?.label ?? inv.affiliate}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge invitation={inv} />
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{formatDate(inv.created_at)}</td>
                  <td className="px-6 py-4 text-muted-foreground">{formatDate(inv.expires_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
