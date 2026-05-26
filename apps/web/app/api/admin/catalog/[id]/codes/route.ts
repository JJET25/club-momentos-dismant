import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { MANAGER_ROLES } from '@/lib/permissions'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id: skuId } = await params
  const supabase = createAdminClient()

  const { count: total }    = await supabase.from('digital_codes').select('*', { count: 'exact', head: true }).eq('sku_id', skuId)
  const { count: available } = await supabase.from('digital_codes').select('*', { count: 'exact', head: true }).eq('sku_id', skuId).is('assigned_to', null)

  return NextResponse.json({ total: total ?? 0, available: available ?? 0 })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id: skuId } = await params
  const formData      = await req.formData()
  const file          = formData.get('csv') as File | null

  if (!file) return NextResponse.json({ error: 'No se recibió archivo CSV' }, { status: 400 })

  const supabase = createAdminClient()

  // Verify SKU exists and is digital
  const { data: sku } = await supabase
    .from('reward_skus')
    .select('id, name, is_digital')
    .eq('id', skuId)
    .single()

  if (!sku) return NextResponse.json({ error: 'SKU no encontrado' }, { status: 404 })
  if (!sku.is_digital) return NextResponse.json({ error: 'Este SKU no es digital' }, { status: 400 })

  const text   = await file.text()
  const lines  = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const header = lines[0]?.toLowerCase().replace(/\s/g, '')

  if (!header?.includes('codigo')) {
    return NextResponse.json({ error: 'El CSV debe tener una columna: codigo' }, { status: 400 })
  }

  const colIdx = lines[0].split(',').findIndex(c => c.trim().toLowerCase() === 'codigo')
  const codes  = lines.slice(1)
    .map(l => l.split(',')[colIdx]?.trim())
    .filter((c): c is string => !!c)

  if (codes.length === 0) {
    return NextResponse.json({ error: 'No se encontraron códigos válidos en el CSV' }, { status: 400 })
  }

  // Batch insert codes
  const rows = codes.map(code => ({ id: crypto.randomUUID(), sku_id: skuId, code }))

  const { error } = await supabase.from('digital_codes').insert(rows)
  if (error) return NextResponse.json({ error: 'Error al importar los códigos' }, { status: 500 })

  // Update SKU stock count
  const { count: available } = await supabase
    .from('digital_codes')
    .select('*', { count: 'exact', head: true })
    .eq('sku_id', skuId)
    .is('assigned_to', null)

  await supabase
    .from('reward_skus')
    .update({ stock: available ?? 0 })
    .eq('id', skuId)

  await supabase.from('audit_log').insert({
    actor_id:    session.sub,
    action:      'catalog.codes_uploaded',
    target_type: 'reward_sku',
    target_id:   skuId,
    metadata:    { file: file.name, codes_added: codes.length, new_stock: available },
  })

  return NextResponse.json({ imported: codes.length, new_stock: available ?? 0 }, { status: 201 })
}
