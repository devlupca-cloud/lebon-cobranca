'use server'

import { createAdminClient } from '@/lib/supabase/admin'

/** Senha padrão para novos usuários; eles devem trocar no primeiro acesso. */
const DEFAULT_PASSWORD = 'Lebon@Trocar123'

export type CreateCompanyUserResult =
  | { ok: true; temporaryPassword: string }
  | { ok: false; error: string }

/**
 * Cria usuário no Auth com senha padrão e vincula à empresa em company_users.
 * Não envia e-mail; o usuário acessa com a senha padrão e troca depois.
 */
export async function createCompanyUserWithPassword(
  companyId: string,
  name: string,
  email: string,
  role: string | null
): Promise<CreateCompanyUserResult> {
  const trimmedName = name.trim()
  const trimmedEmail = email.trim().toLowerCase()
  if (!trimmedName || !trimmedEmail) {
    return { ok: false, error: 'Nome e e-mail são obrigatórios.' }
  }

  try {
    const supabase = createAdminClient()

    const { data: createData, error: createError } =
      await supabase.auth.admin.createUser({
        email: trimmedEmail,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: trimmedName },
      })

    if (createError) {
      const msg = createError.message
      if (msg.includes('already been registered') || msg.includes('already exists')) {
        return { ok: false, error: 'Este e-mail já está cadastrado no sistema.' }
      }
      return { ok: false, error: msg }
    }

    const user = createData?.user
    if (!user?.id) {
      return { ok: false, error: 'Usuário criado no Auth, mas não foi possível vincular à empresa. Tente novamente.' }
    }

    const { error: insertError } = await supabase.from('company_users').insert({
      id: user.id,
      company_id: companyId,
      name: trimmedName,
      email: trimmedEmail,
      role: role?.trim() ?? '',
      user_id: user.id,
      is_active: true,
    })

    if (insertError) {
      return {
        ok: false,
        error: insertError.message || 'Erro ao vincular usuário à empresa.',
      }
    }

    return { ok: true, temporaryPassword: DEFAULT_PASSWORD }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro ao criar usuário.'
    return { ok: false, error: message }
  }
}
