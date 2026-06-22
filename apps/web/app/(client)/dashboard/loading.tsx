export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-44 bg-muted rounded-2xl" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
      </div>
      <div>
        <div className="h-5 w-40 bg-muted rounded mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-muted rounded-2xl" />)}
        </div>
      </div>
      <div>
        <div className="h-5 w-44 bg-muted rounded mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-44 bg-muted rounded-xl" />)}
        </div>
      </div>
      <div className="h-32 bg-muted rounded-xl" />
      <div className="h-56 bg-muted rounded-xl" />
    </div>
  )
}
