import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { rfc } = await req.json()
  if (!rfc) return NextResponse.json({ error: 'RFC requerido' }, { status: 400 })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('members')
    .select('id')
    .eq('rfc', rfc.toUpperCase().trim())
    .maybeSingle()

  return NextResponse.json({ exists: !!data })
}
