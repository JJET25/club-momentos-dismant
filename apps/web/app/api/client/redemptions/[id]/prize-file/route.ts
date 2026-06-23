import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { getSignedDownloadUrl } from '@/lib/storage'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { data: redemption } = await supabase
    .from('redemptions')
    .select('id, member_id, prize_file_key')
    .eq('id', id)
    .eq('member_id', session.sub)
    .single()

  if (!redemption) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (!redemption.prize_file_key) return NextResponse.json({ error: 'Sin archivo adjunto' }, { status: 404 })

  // URL firmada válida 15 minutos
  const url = await getSignedDownloadUrl(redemption.prize_file_key, 900)
  return NextResponse.redirect(url)
}
