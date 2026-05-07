'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'

export type LoginState = {
  error: string | null
}

/**
 * Login via Server Action: roda no servidor, permite rate limit por IP real
 * antes de chamar o Supabase Auth e retorna mensagens genericas para mitigar
 * enumeracao de e-mails.
 */
export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Informe e-mail e senha.' }
  }

  // Rate limit por IP antes de qualquer chamada ao Auth.
  const headersList = await headers()
  const ip = getClientIdentifier({
    headers: { get: (name: string) => headersList.get(name) },
  })

  const rl = await checkRateLimit(ip, 'auth-attempt')
  if (!rl.success) {
    return {
      error: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    return {
      error:
        'Supabase nao configurado. Adicione NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    }
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {
          // cookies().set pode falhar em alguns runtimes; ignorar.
        }
      },
      remove(name: string, options: Record<string, unknown>) {
        try {
          cookieStore.set({ name, value: '', maxAge: 0, ...options })
        } catch {
          // idem
        }
      },
    },
  })

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    // Mensagem generica para mitigar enumeracao (mesmo erro para email
    // inexistente vs senha errada).
    // eslint-disable-next-line no-console
    console.warn('[loginAction] auth error:', error.message)
    return { error: 'E-mail ou senha incorretos.' }
  }

  redirect('/home')
}
