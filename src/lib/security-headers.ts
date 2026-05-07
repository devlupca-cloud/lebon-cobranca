import { NextResponse } from 'next/server'

/**
 * Headers de seguranca aplicados em todas as respostas pelo `proxy.ts`.
 *
 * Estrategia conservadora: previne clickjacking, MIME sniffing, leakage de
 * referrer e usa de APIs sensiveis sem quebrar Next.js (que precisa de
 * inline scripts/styles para hidration e Tailwind 4 inline).
 *
 * CSP rigoroso (sem unsafe-inline/unsafe-eval) requer nonces gerados por
 * request — fica como upgrade futuro.
 */

const SUPABASE_HOST = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return ''
  try {
    return new URL(url).origin
  } catch {
    return ''
  }
})()

const CSP_DIRECTIVES: Record<string, string[]> = {
  'default-src': ["'self'"],
  // Next.js 16 ainda usa inline scripts para hidration; eval e usado em dev.
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  // Tailwind 4 + componentes injetam style inline.
  'style-src': ["'self'", "'unsafe-inline'"],
  // data: para favicons; blob: para previews; supabase para signed URLs de
  // photo_user e file.
  'img-src': ["'self'", 'data:', 'blob:', SUPABASE_HOST].filter(Boolean),
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'", SUPABASE_HOST, 'https://*.upstash.io'].filter(Boolean),
  'frame-ancestors': ["'none'"],
  'form-action': ["'self'"],
  'base-uri': ["'self'"],
  'object-src': ["'none'"],
}

const CSP = Object.entries(CSP_DIRECTIVES)
  .map(([k, v]) => `${k} ${v.join(' ')}`)
  .join('; ')

const HEADERS: Record<string, string> = {
  'Content-Security-Policy': CSP,
  // Defesa em profundidade (alguns browsers ainda priorizam este header).
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // 2 anos + preload-ready.
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  // Bloqueia APIs que a app nao usa.
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'X-DNS-Prefetch-Control': 'on',
  // Evita que browsers especulem com a URL exata de fetches.
  'X-Permitted-Cross-Domain-Policies': 'none',
}

export function applySecurityHeaders<T extends NextResponse>(response: T): T {
  for (const [name, value] of Object.entries(HEADERS)) {
    response.headers.set(name, value)
  }
  return response
}
