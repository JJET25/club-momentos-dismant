import { MANAGER_ROLES } from '@/lib/permissions'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !MANAGER_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  const supabase = createAdminClient()

  // Fetch current SKU to detect stock change
  const { data: current } = await supabase
    .from('reward_skus')
    .select('id, stock, name')
    .eq('id', id)
    .single()

  if (!current) return NextResponse.json({ error: 'Premio no encontrado' }, { status: 404 })

  const {
    name, description, image_url, points_cost, stock,
    stock_alert_threshold, geo_type, geo_states, geo_cities,
    is_digital, category,
  } = body

  // Build update payload with only provided fields
  const update: Record<string, unknown> = {}
  if (name        !== undefined) update.name                  = name.trim()
  if (description !== undefined) update.description           = description?.trim() || null
  if (image_url   !== undefined) update.image_url             = image_url?.trim() || null
  if (points_cost !== undefined) update.points_cost           = points_cost
  if (stock       !== undefined) update.stock                 = stock
  if (stock_alert_threshold !== undefined) update.stock_alert_threshold = stock_alert_threshold
  if (geo_type    !== undefined) update.geo_type              = geo_type
  if (geo_states  !== undefined) update.geo_states            = geo_states
  if (geo_cities  !== undefined) update.geo_cities            = geo_cities
  if (is_digital  !== undefined) update.is_digital            = is_digital
  if (category    !== undefined) update.category              = category?.trim() || null

  const { data, error } = await supabase
    .from('reward_skus')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Error al actualizar premio' }, { status: 500 })

  // Audit stock changes
  if (stock !== undefined && stock !== current.stock) {
    await supabase.from('audit_log').insert({
      actor_id:    session.sub,
      action:      'catalog.stock_updated',
      target_type: 'reward_sku',
      target_id:   id,
      metadata:    { sku_name: current.name, previous_stock: current.stock, new_stock: stock, delta: stock - current.stock },
    })
  }

  return NextResponse.json({ sku: data })
}
