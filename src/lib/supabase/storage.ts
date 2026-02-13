import { createClient } from '@/lib/supabase/client'

/** Nome do bucket de foto do usuário no Supabase Storage. Crie em Storage com este nome ou defina NEXT_PUBLIC_SUPABASE_BUCKET_PHOTO_USER. */
const BUCKET_PHOTO_USER =
  typeof process.env.NEXT_PUBLIC_SUPABASE_BUCKET_PHOTO_USER === 'string' &&
  process.env.NEXT_PUBLIC_SUPABASE_BUCKET_PHOTO_USER.length > 0
    ? process.env.NEXT_PUBLIC_SUPABASE_BUCKET_PHOTO_USER
    : 'photo_user'

/**
 * Faz upload de um arquivo para o bucket photo_user e retorna a URL pública.
 * path: ex. "photo/{userId}/{fileName}"
 */
export async function uploadPhotoUser(
  path: string,
  file: File
): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(BUCKET_PHOTO_USER)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (error) throw error

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_PHOTO_USER).getPublicUrl(data.path)
  return publicUrl
}
