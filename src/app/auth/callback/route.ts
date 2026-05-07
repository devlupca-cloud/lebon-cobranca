import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/home'
  // Open redirect guard: aceita apenas paths internos comecando com '/' e nao protocol-relative ('//')
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/home'

  if (code) {
    // Rate limit por IP: protege contra abuse de troca de code (recovery brute-force).
    const ip = getClientIdentifier(request)
    const rl = await checkRateLimit(ip, 'auth-callback')
    if (!rl.success) {
      return NextResponse.redirect(
        new URL('/login?error=Muitas+tentativas.+Aguarde+um+minuto+e+tente+novamente.', request.url)
      )
    }

    const response = NextResponse.redirect(new URL(next, request.url))

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: Record<string, unknown>) {
            response.cookies.set({ name, value: '', maxAge: 0, ...options })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return response
    }
  }

  // If code is missing or exchange failed, redirect to login with error
  return NextResponse.redirect(
    new URL('/login?error=Link+invalido+ou+expirado.+Solicite+um+novo.', request.url)
  )
}
