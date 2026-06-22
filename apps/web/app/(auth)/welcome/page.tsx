import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

const AFFILIATE_CLUB: Record<string, string> = {
  dismant: 'Club Momentos Dismant',
  lauti:   'Club Momentos Lauti',
}

export default async function WelcomePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Leer el afiliado del perfil del miembro recién registrado
  const { createAdminClient } = await import('@/lib/supabase')
  const supabase = createAdminClient()
  const { data: member } = await supabase
    .from('members')
    .select('affiliate')
    .eq('id', session.sub)
    .single()

  const clubName = AFFILIATE_CLUB[member?.affiliate ?? 'dismant'] ?? 'Club Momentos Dismant'
  const welcomePoints = parseInt(process.env.WELCOME_BONUS_POINTS ?? '100')
  const firstName = session.name.split(' ')[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 to-brand-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-2xl shadow-2xl p-10">
          <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            ¡Bienvenido, {firstName}!
          </h1>
          <p className="text-muted-foreground mb-6">
            Tu cuenta está lista. Ya eres parte del {clubName}.
          </p>

          <div className="bg-brand-50 rounded-xl p-5 mb-8">
            <p className="text-sm text-brand-700 mb-1">Puntos de bienvenida acreditados</p>
            <p className="text-4xl font-bold text-brand-600">+{welcomePoints}</p>
            <p className="text-xs text-brand-500 mt-1">puntos</p>
          </div>

          <div className="space-y-3">
            <Link
              href="/catalog"
              className="block w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 transition-colors"
            >
              Ver catálogo de premios
            </Link>
            <Link
              href="/dashboard"
              className="block w-full bg-white text-brand-600 border border-brand-200 py-3 rounded-lg font-medium hover:bg-brand-50 transition-colors"
            >
              Ir a mi cuenta
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
