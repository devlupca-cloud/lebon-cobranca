'use client'

import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { MdVisibility, MdVisibilityOff } from 'react-icons/md'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        setError(updateError.message)
        return
      }

      setSuccess(true)
    } catch {
      setError('Erro ao redefinir senha. Tente novamente.')
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
          Redefinir senha
        </h1>
        <p className="mb-8 text-center text-sm text-[#536471]">
          Digite sua nova senha abaixo
        </p>

        {success ? (
          <div className="space-y-6">
            <div className="rounded-[8px] bg-green-50 px-3 py-3 text-center text-sm text-green-700">
              Senha redefinida com sucesso!
            </div>

            <Link
              href="/login"
              className="block w-full rounded-[8px] bg-[#1E3A8A] px-4 py-3 text-center text-sm font-medium text-white shadow-sm transition hover:bg-[#1d4ed8]"
            >
              Ir para login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#0f1419]">
                Nova senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-[8px] border border-[#e5e7eb] bg-white py-2.5 pl-3 pr-11 text-sm text-[#0f1419] placeholder:text-[#94a3b8] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                  placeholder="Mínimo 6 caracteres"
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

            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-[#0f1419]">
                Confirmar nova senha
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-[8px] border border-[#e5e7eb] bg-white py-2.5 pl-3 pr-11 text-sm text-[#0f1419] placeholder:text-[#94a3b8] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                  placeholder="Repita a nova senha"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[#536471] hover:bg-[#f0f2f6] hover:text-[#0f1419]"
                  aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showConfirm ? (
                    <MdVisibilityOff className="h-5 w-5" />
                  ) : (
                    <MdVisibility className="h-5 w-5" />
                  )}
                </button>
              </div>
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
              {loading ? 'Salvando...' : 'Salvar nova senha'}
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
