'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useActionState, useEffect, useState } from 'react'
import { MdVisibility, MdVisibilityOff } from 'react-icons/md'
import { loginAction, type LoginState } from './actions'

const initialState: LoginState = { error: null }

/** Read error from ?error= query string OR #error= hash fragment (Supabase uses both) */
function useAuthError(): string | null {
  const searchParams = useSearchParams()
  const [hashError, setHashError] = useState<string | null>(null)

  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      const params = new URLSearchParams(hash.substring(1))
      const desc = params.get('error_description')
      const code = params.get('error_code')
      if (desc || code) {
        const msg = code === 'otp_expired'
          ? 'O link expirou ou já foi utilizado. Solicite um novo.'
          : desc?.replace(/\+/g, ' ') ?? 'Erro de autenticação.'
        setHashError(msg)
        // Clean the hash from URL
        window.history.replaceState(null, '', window.location.pathname)
      }
    }
  }, [])

  const queryError = searchParams.get('error')
  return hashError ?? queryError
}

function LoginForm() {
  const urlError = useAuthError()
  const [showPassword, setShowPassword] = useState(false)
  const [state, formAction, isPending] = useActionState(loginAction, initialState)

  const error = state.error ?? urlError

  return (
    <div className="w-full max-w-[400px] rounded-[8px] border border-[#e5e7eb] bg-white p-8 shadow-lg">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-[#e5e7eb] bg-white shadow-inner">
          <Image
            src="/Logo_lebon.jpg"
            alt="Lebon Cobrança"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

      <h1 className="mb-1 text-center text-xl font-semibold tracking-tight text-[#0f1419]">
        Bem-vindo
      </h1>
      <p className="mb-8 text-center text-sm text-[#536471]">
        Preencha os campos para entrar
      </p>

      <form action={formAction} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#0f1419]">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-[#0f1419] placeholder:text-[#94a3b8] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
            placeholder="seu@email.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#0f1419]">
            Senha
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              className="w-full rounded-[8px] border border-[#e5e7eb] bg-white py-2.5 pl-3 pr-11 text-sm text-[#0f1419] placeholder:text-[#94a3b8] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[#536471] hover:bg-[#f0f2f6] hover:text-[#0f1419]"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? (
                <MdVisibilityOff className="h-5 w-5" />
              ) : (
                <MdVisibility className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <Link
            href="/esqueci-senha"
            className="text-sm font-medium text-[#1E3A8A] hover:text-[#1d4ed8]"
          >
            Esqueceu a senha?
          </Link>
        </div>

        {error && (
          <p className="rounded-[8px] bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-[8px] bg-[#1E3A8A] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#1d4ed8] disabled:opacity-50"
        >
          {isPending ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      {/* Cadastro desabilitado por enquanto */}
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f2f6] px-4 py-8">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  )
}
