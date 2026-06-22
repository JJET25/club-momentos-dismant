import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-foreground">404</h1>
        <p className="mt-3 text-lg text-muted-foreground">Página no encontrada</p>
        <Link
          href="/login"
          className="mt-6 inline-block bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition-colors"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  )
}
