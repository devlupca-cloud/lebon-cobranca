'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function CadastreSePage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })
      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }
      setMessage('Conta criada. Verifique seu e-mail para confirmar (se exigido pelo projeto).')
      router.refresh()
      router.push('/login')
    } catch {
      setError('Erro ao cadastrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold text-zinc-900">Cadastre-se</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-700">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-zinc-700">
              Confirmar senha
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="text-sm text-green-600" role="status">
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-[#1E3A8A] px-4 py-2 font-medium text-white hover:bg-[#1e40af] disabled:opacity-50"
          >
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-600">
          Já tem conta?{' '}
          <a href="/login" className="font-medium text-[#1E3A8A] hover:underline">
            Entrar
          </a>
        </p>
      </div>
    </div>
  )
}
