import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Iniciar sesión',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 to-brand-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
            <span className="text-2xl font-bold text-white">D</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Club Momentos Dismant</h1>
          <p className="text-brand-300 mt-1">Ingresa a tu cuenta de lealtad</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-foreground mb-2">Bienvenido</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Te enviaremos un enlace de acceso a tu correo. Sin contraseñas.
          </p>

          {/* TODO: Reemplazar con <LoginForm /> cuando esté listo */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                placeholder="tu@empresa.com"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors">
              Enviar enlace de acceso
            </button>
          </div>

          <div className="mt-6 text-center">
            <span className="text-sm text-muted-foreground">¿Aún no tienes cuenta?{' '}</span>
            <a href="/register" className="text-sm text-primary font-medium hover:underline">
              Regístrate aquí
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
