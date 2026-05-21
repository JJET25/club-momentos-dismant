export default function CatalogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Catálogo de Premios</h1>
        <p className="text-muted-foreground text-sm mt-1">Canjea tus puntos por premios exclusivos.</p>
      </div>
      <div className="bg-card rounded-xl border p-16 text-center">
        <div className="text-5xl mb-4">🎁</div>
        <p className="text-base font-semibold text-foreground mb-1">Próximamente</p>
        <p className="text-sm text-muted-foreground">El catálogo de premios estará disponible pronto.</p>
      </div>
    </div>
  )
}
