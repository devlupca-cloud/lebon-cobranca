import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const LOGIN_PATH = '/login'
const CADASTRE_SE_PATH = '/cadastre-se'
const FORGOT_PASSWORD_PATH = '/esqueci-senha'
const RESET_PASSWORD_PATH = '/redefinir-senha'
const HOME_PATH = '/home'

function isAuthRoute(pathname: string) {
  return pathname === LOGIN_PATH || pathname === CADASTRE_SE_PATH || pathname === FORGOT_PASSWORD_PATH
}

function isResetPasswordRoute(pathname: string) {
  return pathname === RESET_PASSWORD_PATH
}

function isProtectedRoute(pathname: string) {
  if (pathname === '/' || isAuthRoute(pathname)) return false
  return true
}

export async function middleware(request: NextRequest) {
  // If there's a ?code= param (but NOT already on /auth/callback), redirect to the callback
  // route to exchange it for a session. Supabase sends recovery codes to the Site URL root.
  const code = request.nextUrl.searchParams.get('code')
  if (code && request.nextUrl.pathname !== '/auth/callback') {
    const callbackUrl = new URL('/auth/callback', request.url)
    callbackUrl.searchParams.set('code', code)
    const next = request.nextUrl.searchParams.get('next') ?? '/redefinir-senha'
    callbackUrl.searchParams.set('next', next)
    return NextResponse.redirect(callbackUrl)
  }

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Allow authenticated users on /redefinir-senha (they just came from the reset email)
  if (isResetPasswordRoute(request.nextUrl.pathname)) {
    if (!user) {
      return NextResponse.redirect(new URL(LOGIN_PATH, request.url))
    }
    return response
  }

  if (user && isAuthRoute(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL(HOME_PATH, request.url))
  }

  if (!user && isProtectedRoute(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url))
  }

  if (!user && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url))
  }

  if (user && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL(HOME_PATH, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
