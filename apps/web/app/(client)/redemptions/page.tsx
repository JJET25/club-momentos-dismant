export default function RedemptionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mis Canjes</h1>
        <p className="text-muted-foreground text-sm mt-1">Historial de premios canjeados.</p>
      </div>
      <div className="bg-card rounded-xl border p-16 text-center">
        <div className="text-5xl mb-4">🎫</div>
        <p className="text-base font-semibold text-foreground mb-1">Próximamente</p>
        <p className="text-sm text-muted-foreground">Aquí verás todos tus canjes realizados.</p>
      </div>
    </div>
  )
}
