import { createAdminClient } from '@/lib/supabase'

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'club-momentos'

function storage() {
  return createAdminClient().storage
}

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const { error } = await storage()
    .from(BUCKET)
    .upload(key, body, { contentType, upsert: true })
  if (error) throw error
  return key
}

export async function getSignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  const { data, error } = await storage().from(BUCKET).createSignedUrl(key, expiresInSeconds)
  if (error || !data) throw error ?? new Error('No se pudo generar URL firmada')
  return data.signedUrl
}

export async function downloadFileContent(key: string): Promise<Buffer | null> {
  const { data, error } = await storage().from(BUCKET).download(key)
  if (error) {
    if (error.message.toLowerCase().includes('not found')) return null
    throw error
  }
  if (!data) return null
  return Buffer.from(await data.arrayBuffer())
}

export async function deleteFile(key: string): Promise<void> {
  const { error } = await storage().from(BUCKET).remove([key])
  if (error) throw error
}

// ── Convenciones de rutas en Storage ─────────────────────────
export const STORAGE_PATHS = {
  invoice: (memberId: string, uuidCfdi: string) =>
    `invoices/${memberId}/${uuidCfdi}.xml`,
  invoiceEvidence: (invoiceId: string, ext: string) =>
    `invoices/${invoiceId}/evidence.${ext}`,
  rewardCover: (skuId: string) =>
    `rewards/${skuId}/cover.webp`,
  promotionBanner: (promotionId: string, ext = 'webp') =>
    `promotions/${promotionId}/banner.${ext}`,
  statement: (memberId: string, yearMonth: string) =>
    `statements/${memberId}/${yearMonth}.pdf`,
  prizeFile: (redemptionId: string, ext: string) =>
    `prizes/${redemptionId}/file.${ext}`,
}
