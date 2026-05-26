import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Get member location for geo-filtering
  const { data: member } = await supabase
    .from('members')
    .select('location_state, location_city')
    .eq('id', session.sub)
    .single()

  const memberState = member?.location_state ?? ''
  const memberCity  = member?.location_city  ?? ''

  const { data, error } = await supabase
    .from('partner_promotions')
    .select(`
      id, title, description, image_url, destination_url,
      geo_type, geo_states, geo_cities, valid_from, valid_until,
      status, featured,
      partners!partner_id ( id, name, logo_url, is_verified )
    `)
    .eq('status', 'active')
    .lte('valid_from',  now)
    .gte('valid_until', now)
    .order('featured',    { ascending: false })
    .order('created_at',  { ascending: false })

  if (error) return NextResponse.json({ error: 'Error al obtener promociones' }, { status: 500 })

  // Geo filter: nacional siempre, local solo si estado/ciudad coincide
  const filtered = (data ?? []).filter(p => {
    if (p.geo_type === 'national') return true
    const states: string[] = p.geo_states ?? []
    const cities: string[] = p.geo_cities ?? []
    return states.includes(memberState) || cities.includes(memberCity)
  })

  return NextResponse.json({ promotions: filtered })
}
