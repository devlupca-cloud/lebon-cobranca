import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { applySecurityHeaders } from '@/lib/security-headers'

const LOGIN_PATH = '/login'
const CADASTRE_SE_PATH = '/cadastre-se'
const FORGOT_PASSWORD_PATH = '/esqueci-senha'
const RESET_PASSWORD_PATH = '/redefinir-senha'
const HOME_PATH = '/home'

function isAuthRoute(pathname: string) {
  return pathname === LOGIN_PATH || pathname === CADASTRE_SE_PATH || pathname === FORGOT_PASSWORD_PATH
}

function isProtectedRoute(pathname: string) {
  if (pathname === '/' || pathname === RESET_PASSWORD_PATH || isAuthRoute(pathname)) return false
  if (pathname.startsWith('/auth/')) return false
  return true
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request })

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

  // ── Handle ?code= from Supabase (password recovery, magic link, etc.) ──
  // Exchange the code for a session right here in the middleware, then redirect.
  const code = request.nextUrl.searchParams.get('code')
  if (code) {
    // Rate limit por IP antes do exchange (mesmo limite do /auth/callback).
    const ip = getClientIdentifier(request)
    const rl = await checkRateLimit(ip, 'auth-callback')
    if (!rl.success) {
      return applySecurityHeaders(NextResponse.redirect(
        new URL('/login?error=Muitas+tentativas.+Aguarde+um+minuto+e+tente+novamente.', request.url)
      ))
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Session is set. Copy cookies to a redirect response → /redefinir-senha
      const redirectUrl = new URL(RESET_PASSWORD_PATH, request.url)
      const redirectResponse = NextResponse.redirect(redirectUrl)
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, {
          ...cookie,
        })
      })
      return applySecurityHeaders(redirectResponse)
    }

    // Exchange failed → send to login with friendly error
    return applySecurityHeaders(NextResponse.redirect(
      new URL('/login?error=Link+inv%C3%A1lido+ou+expirado.+Solicite+um+novo.', request.url)
    ))
  }

  // ── Normal auth checks ──
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // /redefinir-senha: only accessible if authenticated (just came from recovery)
  if (request.nextUrl.pathname === RESET_PASSWORD_PATH) {
    if (!user) {
      return applySecurityHeaders(NextResponse.redirect(new URL(LOGIN_PATH, request.url)))
    }
    return applySecurityHeaders(response)
  }

  if (user && isAuthRoute(request.nextUrl.pathname)) {
    return applySecurityHeaders(NextResponse.redirect(new URL(HOME_PATH, request.url)))
  }

  if (!user && isProtectedRoute(request.nextUrl.pathname)) {
    return applySecurityHeaders(NextResponse.redirect(new URL(LOGIN_PATH, request.url)))
  }

  if (!user && request.nextUrl.pathname === '/') {
    return applySecurityHeaders(NextResponse.redirect(new URL(LOGIN_PATH, request.url)))
  }

  if (user && request.nextUrl.pathname === '/') {
    return applySecurityHeaders(NextResponse.redirect(new URL(HOME_PATH, request.url)))
  }

  return applySecurityHeaders(response)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
