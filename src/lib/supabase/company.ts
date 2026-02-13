import { createClient } from '@/lib/supabase/client'

export type Profile = {
  company_id: string
  name: string | null
  email: string | null
  photo_user: string | null
}

/**
 * Obtém o company_id do usuário logado via tabela company_users.
 */
export async function getCompanyId(): Promise<string | null> {
  const profile = await getProfile()
  return profile?.company_id ?? null
}

/** Resultado da RPC get_my_profile (uma única query no banco). */
type GetMyProfileRpcRow = {
  company_id: string
  name: string | null
  email: string | null
  photo_user: string | null
}

/**
 * Obtém o perfil do usuário autenticado em uma única chamada à RPC get_my_profile.
 * Use no dashboard para evitar múltiplas queries. Não chama auth.getUser().
 */
export async function getMyProfileRpc(): Promise<Profile | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_my_profile')
  if (error || data == null) return null
  const row = data as GetMyProfileRpcRow | null
  if (!row?.company_id) return null
  return {
    company_id: row.company_id,
    name: row.name ?? null,
    email: row.email ?? null,
    photo_user: row.photo_user ?? null,
  }
}

/**
 * Obtém o perfil do usuário (company_users) para o usuário logado.
 * Tenta por id = user.id e depois por user_id = user.id.
 * Para o dashboard, prefira usar o contexto (DashboardAuthProvider) que carrega user + perfil em uma carga.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return null

  const { data: byId, error: errId } = await supabase
    .from('company_users')
    .select('company_id, name, email, photo_user')
    .eq('id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (!errId && byId) {
    return {
      company_id: byId.company_id,
      name: byId.name ?? null,
      email: byId.email ?? null,
      photo_user: byId.photo_user ?? null,
    }
  }

  const { data: byUserId, error: errUser } = await supabase
    .from('company_users')
    .select('company_id, name, email, photo_user')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (!errUser && byUserId) {
    return {
      company_id: byUserId.company_id,
      name: byUserId.name ?? null,
      email: byUserId.email ?? null,
      photo_user: byUserId.photo_user ?? null,
    }
  }
  return null
}

/**
 * Atualiza a URL da foto do usuário em company_users.
 */
export async function updateProfilePhoto(photoUrl: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) throw new Error('Usuário não autenticado')

  const { error: errId } = await supabase
    .from('company_users')
    .update({ photo_user: photoUrl })
    .eq('id', user.id)

  if (!errId) return

  const { error: errUser } = await supabase
    .from('company_users')
    .update({ photo_user: photoUrl })
    .eq('user_id', user.id)

  if (errUser) throw errUser
}
