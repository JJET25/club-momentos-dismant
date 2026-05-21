import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-2">
        No tienes permisos para esta sección.
      </h1>
      <p className="text-muted-foreground max-w-sm">
        Tu rol actual no te permite acceder a este módulo del panel. Contacta a un administrador si crees que esto es un error.
      </p>

      <Link
        href="/admin/dashboard"
        className="mt-8 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
      >
        Ir al Dashboard
      </Link>
    </div>
  )
}
