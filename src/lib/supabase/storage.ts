import { createClient } from '@/lib/supabase/client'

/** Bucket de documentos (contratos/clientes). */
export const BUCKET_FILE =
  typeof process.env.NEXT_PUBLIC_SUPABASE_BUCKET_DOCUMENTS === 'string' &&
  process.env.NEXT_PUBLIC_SUPABASE_BUCKET_DOCUMENTS.length > 0
    ? process.env.NEXT_PUBLIC_SUPABASE_BUCKET_DOCUMENTS
    : 'file'

/** Bucket de fotos de perfil. */
export const BUCKET_PHOTO_USER =
  typeof process.env.NEXT_PUBLIC_SUPABASE_BUCKET_PHOTO_USER === 'string' &&
  process.env.NEXT_PUBLIC_SUPABASE_BUCKET_PHOTO_USER.length > 0
    ? process.env.NEXT_PUBLIC_SUPABASE_BUCKET_PHOTO_USER
    : 'photo_user'

/** Tempo padrao de expiracao das signed URLs (segundos). 1h. */
export const DEFAULT_SIGNED_URL_TTL = 60 * 60

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

/**
 * Faz upload no bucket informado e retorna o PATH do objeto.
 * Para gerar uma URL acessivel, usar `getSignedUrl(path, bucket)`.
 */
async function uploadAndGetPath(
  bucket: string,
  path: string,
  file: File,
  options: { upsert?: boolean } = {}
): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: options.upsert ?? false,
    })
  if (error) throw error
  return data.path
}

export async function uploadFile(path: string, file: File): Promise<string> {
  return uploadAndGetPath(BUCKET_FILE, path, file)
}

/**
 * Faz upload no bucket photo_user (upsert=true para sobrescrever foto antiga)
 * e retorna o PATH do objeto.
 */
export async function uploadPhotoUser(
  path: string,
  file: File
): Promise<string> {
  return uploadAndGetPath(BUCKET_PHOTO_USER, path, file, { upsert: true })
}

/**
 * Resolve uma referencia armazenada em DB (file_url ou photo_user) para uma
 * URL renderizavel pelo browser:
 *   - Se for URL absoluta (http(s)://...): retorna como esta (compat com dados antigos).
 *   - Se for path: gera signed URL no bucket informado.
 * Retorna null se nao conseguir resolver.
 */
export async function resolveStorageRef(
  ref: string | null | undefined,
  bucket: string,
  expiresIn: number = DEFAULT_SIGNED_URL_TTL
): Promise<string | null> {
  if (!ref) return null
  if (isAbsoluteUrl(ref)) return ref
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(ref, expiresIn)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

export function getSignedFileUrl(
  path: string | null | undefined,
  expiresIn?: number
): Promise<string | null> {
  return resolveStorageRef(path, BUCKET_FILE, expiresIn)
}

export function getSignedPhotoUrl(
  path: string | null | undefined,
  expiresIn?: number
): Promise<string | null> {
  return resolveStorageRef(path, BUCKET_PHOTO_USER, expiresIn)
}

/**
 * Resolve um array de objetos com campo de referencia para incluir uma URL
 * assinada. Util para `getCustomerFiles`/`getContractFiles`.
 */
export async function resolveStorageRefs<T extends Record<string, unknown>>(
  rows: T[],
  refField: keyof T,
  bucket: string,
  signedField: string = 'signed_url',
  expiresIn?: number
): Promise<(T & Record<string, string | null>)[]> {
  const resolved = await Promise.all(
    rows.map(async (row) => {
      const ref = row[refField] as string | null | undefined
      const signed = await resolveStorageRef(ref, bucket, expiresIn)
      return { ...row, [signedField]: signed } as T & Record<string, string | null>
    })
  )
  return resolved
}
