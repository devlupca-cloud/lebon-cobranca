'use client'

import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
      })

      if (resetError) {
        setError(resetError.message)
        return
      }

      setSuccess(true)
    } catch {
      setError('Erro ao enviar e-mail. Tente novamente.')
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
          Esqueci a senha
        </h1>
        <p className="mb-8 text-center text-sm text-[#536471]">
          Informe seu e-mail para receber o link de redefinição
        </p>

        {success ? (
          <div className="space-y-6">
            <div className="rounded-[8px] bg-green-50 px-3 py-3 text-center text-sm text-green-700">
              E-mail enviado com sucesso! Verifique sua caixa de entrada para redefinir sua senha.
            </div>

            <Link
              href="/login"
              className="block w-full rounded-[8px] bg-[#1E3A8A] px-4 py-3 text-center text-sm font-medium text-white shadow-sm transition hover:bg-[#1d4ed8]"
            >
              Voltar para login
            </Link>
          </div>
        ) : (
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
              {loading ? 'Enviando...' : 'Enviar link de redefinição'}
            </button>

            <Link
              href="/login"
              className="block text-center text-sm font-medium text-[#1E3A8A] hover:text-[#1d4ed8]"
            >
              Voltar para login
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
