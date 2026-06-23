import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/permissions'
import { uploadFile, STORAGE_PATHS } from '@/lib/storage'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

// Tipos permitidos con variantes comunes entre sistemas operativos
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
  'application/zip', 'application/x-zip', 'application/x-zip-compressed',
  'application/octet-stream', // algunos SO reportan ZIP así
  'text/plain',
])

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg', 'image/jpg': 'jpg',
    'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'application/zip': 'zip',
    'application/x-zip': 'zip',
    'application/x-zip-compressed': 'zip',
    'application/octet-stream': 'bin',
    'text/plain': 'txt',
  }
  return map[mime] ?? 'bin'
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || !STAFF_ROLES.includes(session.role as never)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { id } = await params

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el archivo enviado' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'El archivo no puede superar 10 MB' }, { status: 413 })
  }

  // Detectar extensión real por nombre si el MIME es genérico
  const nameLower = file.name.toLowerCase()
  let mimeType = file.type
  if (!mimeType || mimeType === 'application/octet-stream') {
    if (nameLower.endsWith('.pdf'))  mimeType = 'application/pdf'
    else if (nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg')) mimeType = 'image/jpeg'
    else if (nameLower.endsWith('.png'))  mimeType = 'image/png'
    else if (nameLower.endsWith('.webp')) mimeType = 'image/webp'
    else if (nameLower.endsWith('.gif'))  mimeType = 'image/gif'
    else if (nameLower.endsWith('.zip'))  mimeType = 'application/zip'
    else if (nameLower.endsWith('.txt'))  mimeType = 'text/plain'
  }

  if (!ALLOWED_TYPES.has(mimeType)) {
    return NextResponse.json({
      error: `Tipo de archivo no permitido (${mimeType || 'desconocido'}). Usa PDF, imagen, ZIP o TXT.`,
    }, { status: 415 })
  }

  const ext    = extFromMime(mimeType)
  const key    = STORAGE_PATHS.prizeFile(id, ext)
  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    await uploadFile(key, buffer, mimeType)
  } catch (err) {
    console.error('[upload-prize] Storage upload error:', err)
    return NextResponse.json({ error: 'Error al subir el archivo al almacenamiento.' }, { status: 500 })
  }

  return NextResponse.json({ key, filename: file.name, size: file.size, type: mimeType })
}
