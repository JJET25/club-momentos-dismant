export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="h-7 w-52 bg-muted rounded mb-2" />
          <div className="h-4 w-44 bg-muted rounded" />
        </div>
        <div className="h-6 w-24 bg-muted rounded mt-1" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl border p-5">
            <div className="w-9 h-9 bg-muted rounded-lg mb-3" />
            <div className="h-2.5 bg-muted rounded w-2/3 mb-2" />
            <div className="h-7 bg-muted rounded w-1/2" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-card rounded-xl border h-80" />
        <div className="flex flex-col gap-5">
          <div className="bg-card rounded-xl border h-44" />
          <div className="bg-card rounded-xl border h-52" />
        </div>
      </div>
    </div>
  )
}
