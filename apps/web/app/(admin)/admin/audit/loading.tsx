import { AdminTableSkeleton } from '@/components/page-skeletons'

export default function Loading() {
  return <AdminTableSkeleton cols={5} filters={3} label="Cargando auditoría…" />
}
