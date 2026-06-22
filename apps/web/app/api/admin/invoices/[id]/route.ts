import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { STAFF_ROLES, MANAGER_ROLES } from '@/lib/permissions'
import { createAdminClient } from '@/lib/supabase'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !STAFF_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, status, verification_status')
    .eq('id', id)
    .maybeSingle()

  if (!invoice) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })

  if (invoice.status === 'rejected' || invoice.status === 'cancelled') {
    return NextResponse.json({ error: 'No se puede editar una factura rechazada o cancelada' }, { status: 409 })
  }

  const isVerified = invoice.verification_status === 'verified'
  const manager    = MANAGER_ROLES.includes(session.role as never)

  // Facturas ya verificadas solo editables por managers
  if (isVerified && !manager) {
    return NextResponse.json({ error: 'Solo los administradores pueden editar facturas verificadas' }, { status: 403 })
  }

  const body = await req.json() as {
    folioReferencia?: string
    totalMxn?:        number
    pointsGenerated?: number
    issuedAt?:        string
  }

  const patch: Record<string, unknown> = {}

  if (body.folioReferencia !== undefined) {
    patch.folio_referencia = body.folioReferencia.trim() || null
  }
  if (body.totalMxn !== undefined && typeof body.totalMxn === 'number' && body.totalMxn >= 0) {
    patch.total_mxn = body.totalMxn
  }
  if (body.issuedAt !== undefined) {
    patch.issued_at = new Date(body.issuedAt).toISOString()
  }
  // Puntos solo editables si aún no está verificada (no se han acreditado)
  if (!isVerified && body.pointsGenerated !== undefined) {
    const pts = Number(body.pointsGenerated)
    if (Number.isInteger(pts) && pts > 0) patch.points_generated = pts
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 })
  }

  const { data: updated, error } = await supabase
    .from('invoices')
    .update(patch)
    .eq('id', id)
    .select('id, uuid_cfdi, folio_referencia, total_mxn, points_generated, issued_at, status, verification_status')
    .single()

  if (error) {
    console.error('[invoices/[id]] Error al actualizar:', error)
    return NextResponse.json({ error: 'Error al actualizar la factura' }, { status: 500 })
  }

  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      'invoice.edited',
    target_type: 'invoice',
    target_id:   id,
    metadata:    { changes: patch },
  })

  return NextResponse.json({ invoice: updated })
}
