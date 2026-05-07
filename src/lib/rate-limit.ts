import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Rate limiting opcional via Upstash Redis.
 *
 * Para ativar, configure no .env:
 *   UPSTASH_REDIS_REST_URL=https://...
 *   UPSTASH_REDIS_REST_TOKEN=...
 *
 * Sem essas variaveis, o helper vira no-op (`success: true` sempre) e loga
 * um aviso uma unica vez. Isso permite manter o codigo de protecao no
 * proxy.ts e em route handlers sem obrigar a contratar Upstash agora.
 *
 * O Vercel Marketplace tem integracao 1-clique com Upstash que ja injeta
 * essas envs no projeto.
 */

type RateLimitResult = {
  success: boolean
  remaining: number
  reset: number
}

const NOOP_RESULT: RateLimitResult = { success: true, remaining: Infinity, reset: 0 }

let redis: Redis | null = null
let warnedMissingConfig = false

function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    if (!warnedMissingConfig) {
      // eslint-disable-next-line no-console
      console.warn(
        '[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN nao configurados; rate limiting desativado.'
      )
      warnedMissingConfig = true
    }
    return null
  }
  redis = new Redis({ url, token })
  return redis
}

const limiters: Partial<Record<string, Ratelimit>> = {}

/**
 * Configuracoes de janela por tipo de operacao.
 *  - `auth-attempt`: tentativas de login/recovery (POST). Estreito.
 *  - `auth-callback`: troca de code por sessao em /auth/callback. Moderado.
 *  - `auth-page`: GET de paginas de auth (`/login`, `/esqueci-senha`). Largo.
 */
type Kind = 'auth-attempt' | 'auth-callback' | 'auth-page'

const WINDOWS: Record<Kind, { limit: number; window: `${number} ${'s' | 'm' | 'h'}` }> = {
  'auth-attempt': { limit: 5, window: '1 m' },
  'auth-callback': { limit: 10, window: '1 m' },
  'auth-page': { limit: 60, window: '1 m' },
}

function getLimiter(kind: Kind): Ratelimit | null {
  const r = getRedis()
  if (!r) return null
  if (limiters[kind]) return limiters[kind]!
  const { limit, window } = WINDOWS[kind]
  limiters[kind] = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: false,
    prefix: `rl:${kind}`,
  })
  return limiters[kind]!
}

/**
 * Checa o rate limit por identificador (geralmente IP). Retorna `success: true`
 * imediatamente se Upstash nao estiver configurado.
 */
export async function checkRateLimit(
  identifier: string,
  kind: Kind
): Promise<RateLimitResult> {
  const limiter = getLimiter(kind)
  if (!limiter) return NOOP_RESULT
  try {
    const r = await limiter.limit(identifier)
    return { success: r.success, remaining: r.remaining, reset: r.reset }
  } catch (err) {
    // Em caso de falha do Redis, fail-open para nao quebrar o login.
    // eslint-disable-next-line no-console
    console.error('[rate-limit] Falha ao consultar Upstash:', err)
    return NOOP_RESULT
  }
}

/**
 * Extrai um identificador estavel do request — IP do cliente, com fallback
 * para `x-forwarded-for` e header customizado.
 */
export function getClientIdentifier(request: {
  headers: { get(name: string): string | null }
}): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const real = request.headers.get('x-real-ip')
  if (real) return real
  return 'anonymous'
}
