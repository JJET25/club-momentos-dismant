import { AdminTableSkeleton } from '@/components/page-skeletons'

export default function Loading() {
  return <AdminTableSkeleton cols={6} filters={2} label="Cargando canjes…" />
}
