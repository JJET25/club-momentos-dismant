import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, NoSuchKey } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME!

/** Sube un archivo a R2 */
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
  return key
}

/** Genera una URL prefirmada para descarga temporal (1 hora por defecto) */
export async function getSignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  return getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: expiresInSeconds }
  )
}

/** Descarga el contenido raw de un objeto. Devuelve null si no existe. */
export async function downloadFileContent(key: string): Promise<Buffer | null> {
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
    if (!res.Body) return null
    const chunks: Uint8Array[] = []
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  } catch (err) {
    if (err instanceof NoSuchKey) return null
    throw err
  }
}

/** Elimina un archivo de R2 */
export async function deleteFile(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

// ── Convenciones de rutas en R2 ──────────────────────────────
export const R2_PATHS = {
  invoice: (memberId: string, uuidCfdi: string) =>
    `invoices/${memberId}/${uuidCfdi}.xml`,
  rewardCover: (skuId: string) =>
    `rewards/${skuId}/cover.webp`,
  promotionBanner: (promotionId: string) =>
    `promotions/${promotionId}/banner.webp`,
  statement: (memberId: string, yearMonth: string) =>
    `statements/${memberId}/${yearMonth}.pdf`,
}
