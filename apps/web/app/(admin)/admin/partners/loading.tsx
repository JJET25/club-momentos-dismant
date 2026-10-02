import { AdminTableSkeleton } from '@/components/page-skeletons'

export default function Loading() {
  return <AdminTableSkeleton cols={4} filters={1} label="Cargando aliados…" />
}
