import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

// Endpoint público — no requiere autenticación
export async function GET() {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('global_banners')
    .select('id, message')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ banner: data ?? null })
}
