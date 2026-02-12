import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase com SERVICE ROLE KEY.
 * Usar APENAS no servidor (Server Actions, Route Handlers) para operações
 * que exigem privilégios de admin (ex.: convidar usuário no Auth, inserir em company_users).
 * Nunca exponha esta chave no frontend.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase admin: faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env'
    )
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
