'use client'

import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { MdVisibility, MdVisibilityOff } from 'react-icons/md'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!url || url === '') {
        setError('Supabase não configurado. Adicione NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local')
        setLoading(false)
        return
      }
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }
      router.replace('/home')
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message === 'Failed to fetch' || message.includes('fetch')) {
        setError(
          'Não foi possível conectar ao servidor. Verifique se o Supabase está configurado no .env.local e se o projeto está ativo no dashboard do Supabase.'
        )
      } else {
        setError('Erro ao entrar. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f2f6] px-4 py-8">
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#0f1419]">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
            disabled={loading}
            className="w-full rounded-[8px] bg-[#1E3A8A] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#1d4ed8] disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#536471]">
          Não tem conta?{' '}
          <Link href="/cadastre-se" className="font-medium text-[#1E3A8A] hover:text-[#1d4ed8]">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  )
}
