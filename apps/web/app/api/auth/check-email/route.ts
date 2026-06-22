import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('members')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  return NextResponse.json({ exists: !!data })
}
