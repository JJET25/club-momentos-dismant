import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase'
import { hasPermission } from '@/lib/permissions'
import { canAccessAffiliate, getEffectiveAffiliate } from '@/lib/scope'
import { STAFF_ON_MEMBER_FIELDS, diffProfile, validateProfileInput } from '@/lib/profile'
import { buildFiscalDataChangedEmail, sendEmail } from '@/lib/resend'
import { getAffiliateBaseUrl } from '@/lib/tenant'

const COLUMNS = 'id, full_name, company_name, rfc, email, phone, location_state, location_city, affiliate'

/**
 * PATCH — El staff corrige los datos de un cliente, incluidos RFC y razón
 * social (que el miembro no puede editar por sí mismo; ver lib/profile.ts).
 * Solo clientes (rol member) de una empresa a la que la sesión tiene acceso.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !hasPermission(session.role, 'EDIT_MEMBER')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  const result = validateProfileInput(body, STAFF_ON_MEMBER_FIELDS)
  if (!result.update) return NextResponse.json({ error: result.error }, { status: 400 })

  const { id } = await params
  const supabase = createAdminClient()

  const { data: target } = await supabase
    .from('members')
    .select(`${COLUMNS}, roles!role_id(name)`)
    .eq('id', id)
    .single()

  const targetRole = (target?.roles as unknown as { name: string } | null)?.name
  const perspective = getEffectiveAffiliate(session, req)
  if (
    !target ||
    targetRole !== 'member' ||
    !canAccessAffiliate(session, target.affiliate) ||
    (perspective && target.affiliate !== perspective)
  ) {
    return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })
  }

  const changes = diffProfile(target, result.update)
  if (!Object.keys(changes).length) return NextResponse.json({ ok: true, changes })

  // RFC y razón social determinan qué facturas se aceptan: exigir el motivo
  // (p. ej. folio ARCO) para que el cambio quede justificado en la auditoría
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if ((changes.rfc || changes.company_name) && reason.length < 5) {
    return NextResponse.json({ error: 'Indica el motivo del cambio de RFC o razón social (p. ej. folio ARCO)' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('members')
    .update(result.update)
    .eq('id', id)
    .select(COLUMNS)
    .single()
  if (error || !data) return NextResponse.json({ error: 'Error al actualizar el miembro' }, { status: 500 })

  await supabase.from('audit_log').insert({
    id:          crypto.randomUUID(),
    actor_id:    session.sub,
    action:      changes.rfc ? 'member.rfc_changed' : 'member.profile_updated_by_staff',
    target_type: 'member',
    target_id:   id,
    metadata:    { changes, reason: reason || null },
  })

  // Avisar al miembro: cambiar RFC/razón social cambia qué facturas se le aceptan
  if (changes.rfc || changes.company_name) {
    const fiscal = [
      changes.company_name && { label: 'Razón social', before: String(changes.company_name[0] ?? ''), after: String(changes.company_name[1]) },
      changes.rfc && { label: 'RFC', before: String(changes.rfc[0] ?? ''), after: String(changes.rfc[1]) },
    ].filter((c): c is { label: string; before: string; after: string } => !!c)
    try {
      await sendEmail({
        to:        data.email,
        subject:   'Actualizamos tus datos fiscales',
        affiliate: data.affiliate,
        html:      buildFiscalDataChangedEmail({
          userName:   data.full_name,
          changes:    fiscal,
          profileUrl: `${getAffiliateBaseUrl(data.affiliate)}/profile`,
          affiliate:  data.affiliate,
        }),
      })
    } catch (err) {
      // El cambio ya quedó guardado y auditado; el aviso no debe revertirlo
      console.error('[members/profile] No se pudo enviar el aviso de datos fiscales:', err)
    }
  }

  return NextResponse.json({ ok: true, member: data, changes })
}
