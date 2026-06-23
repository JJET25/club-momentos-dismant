import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { uploadFile, downloadFileContent, STORAGE_PATHS } from '@/lib/storage'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { StatementDocument, type StatementEntry } from '@/components/pdf/StatementDocument'

// Cache PDFs for 1 hour — TTL enforced at request time via Cache-Control
const CACHE_TTL_SECONDS = 3600

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'member') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const from  = searchParams.get('from')  ?? ''
  const to    = searchParams.get('to')    ?? ''
  const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7)

  const memberId = session.sub
  const supabase = createAdminClient()

  // ── 1. Check Storage cache ──────────────────────────────────
  const storageKey = STORAGE_PATHS.statement(memberId, month)
  const fresh = !from && !to // only cache the "current month" view

  if (fresh) {
    try {
      const cached = await downloadFileContent(storageKey)
      if (cached) {
        return new Response(new Uint8Array(cached), {
          headers: {
            'Content-Type':        'application/pdf',
            'Content-Disposition': `attachment; filename="estado-cuenta-${month}.pdf"`,
            'Cache-Control':       `private, max-age=${CACHE_TTL_SECONDS}`,
            'X-Cache':             'HIT',
          },
        })
      }
    } catch {
      // lookup failed — fall through to generation
    }
  }

  // ── 2. Fetch data ───────────────────────────────────────────
  let entriesQuery = supabase
    .from('ledger_entries')
    .select('id, type, points, balance_after, description, created_at, expires_at')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(500)

  if (from) entriesQuery = entriesQuery.gte('created_at', from)
  if (to)   entriesQuery = entriesQuery.lte('created_at', to + 'T23:59:59')

  const [{ data: entries }, { data: memberRow }] = await Promise.all([
    entriesQuery,
    supabase
      .from('members')
      .select('full_name, rfc, company_name, email')
      .eq('id', memberId)
      .single(),
  ])

  if (!memberRow) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  const rows      = (entries ?? []) as StatementEntry[]
  const balance   = rows[0]?.balance_after ?? 0
  const periodLabel = from && to
    ? `${new Date(from).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })} — ${new Date(to).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`
    : month

  // ── 3. Generate PDF ─────────────────────────────────────────
  const docElement = React.createElement(StatementDocument, {
    entries:     rows,
    member:      memberRow,
    balance,
    periodLabel,
    generatedAt: new Date().toLocaleString('es-MX'),
  })

  // Dual-React-types issue in monorepo — safe at runtime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(docElement as any)

  // ── 4. Cache en Storage (async, non-blocking) ──────────────
  if (fresh) {
    uploadFile(storageKey, buffer, 'application/pdf').catch(err =>
      console.error('[statement-pdf] Error al cachear en Storage:', err)
    )
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="estado-cuenta-${month}.pdf"`,
      'Cache-Control':       'private, no-store',
      'X-Cache':             'MISS',
    },
  })
}
