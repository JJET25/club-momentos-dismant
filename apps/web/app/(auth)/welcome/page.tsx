import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getBrand, getBrandCssVars } from '@/lib/brand'

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

  const brand = getBrand((member as { affiliate?: string } | null)?.affiliate)
  const welcomePoints = parseInt(process.env.WELCOME_BONUS_POINTS ?? '100')
  const firstName = session.name.split(' ')[0]

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        ...getBrandCssVars(brand),
        background: `linear-gradient(to bottom right, ${brand.primaryDark}, ${brand.primary})`,
      } as React.CSSProperties}
    >
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-2xl shadow-2xl p-10">
          {brand.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logo} alt={brand.name} className="w-20 h-20 object-contain mx-auto mb-6" />
          ) : (
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: `${brand.primary}1a` }}>
              <span className="text-2xl font-bold" style={{ color: brand.primary }}>{brand.initial}</span>
            </div>
          )}

          <h1 className="text-2xl font-bold text-foreground mb-2">
            ¡Bienvenido, {firstName}!
          </h1>
          <p className="text-muted-foreground mb-6">
            Tu cuenta está lista. Ya eres parte del {brand.name}.
          </p>

          <div className="rounded-xl p-5 mb-8" style={{ background: `${brand.primary}14` }}>
            <p className="text-sm mb-1" style={{ color: brand.primaryDark }}>Puntos de bienvenida acreditados</p>
            <p className="text-4xl font-bold" style={{ color: brand.primary }}>+{welcomePoints}</p>
            <p className="text-xs mt-1" style={{ color: brand.primary }}>puntos</p>
          </div>

          <div className="space-y-3">
            <Link
              href="/catalog"
              className="block w-full text-white py-3 rounded-lg font-medium transition-opacity hover:opacity-90"
              style={{ background: brand.primary }}
            >
              Ver catálogo de premios
            </Link>
            <Link
              href="/dashboard"
              className="block w-full bg-white py-3 rounded-lg font-medium border transition-colors hover:bg-muted/30"
              style={{ color: brand.primary, borderColor: `${brand.primary}40` }}
            >
              Ir a mi cuenta
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
