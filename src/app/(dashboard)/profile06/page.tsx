'use client'

import { LoadingScreen } from '@/components/ui'
import { useDashboardAuth } from '@/contexts/dashboard-auth-context'
import { useHeader } from '@/contexts/header-context'
import { createClient } from '@/lib/supabase/client'
import { updateProfilePhoto } from '@/lib/supabase/company'
import { uploadPhotoUser } from '@/lib/supabase/storage'
import { card, buttonSecondary } from '@/lib/design'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { MdCameraAlt, MdCheckCircle, MdEmail, MdInfoOutline, MdPerson } from 'react-icons/md'

export default function Profile06Page() {
  const { setTitle, setBreadcrumb } = useHeader()
  const { user, profile, loading, refetch } = useDashboardAuth()

  useEffect(() => {
    setTitle('Meu Perfil')
    setBreadcrumb([{ label: 'Home', href: '/home' }, { label: 'Meu Perfil' }])
    return () => {
      setTitle('')
      setBreadcrumb([])
    }
  }, [setTitle, setBreadcrumb])

  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [photoError, setPhotoError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const authEmail = user?.email ?? null

  useEffect(() => {
    setPhotoError(false)
  }, [profile?.photo_user])

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Selecione uma imagem (JPG, PNG, etc.).' })
      return
    }
    setUploading(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u?.id) throw new Error('Usuário não autenticado')
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `photo/${u.id}/${Date.now()}.${ext}`
      const url = await uploadPhotoUser(path, file)
      await updateProfilePhoto(url)
      await refetch()
      setMessage({ type: 'success', text: 'Foto atualizada com sucesso.' })
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao enviar foto.',
      })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (loading) return <LoadingScreen />

  const displayName = profile?.name ?? authEmail ?? 'Usuário'
  const displayEmail = authEmail ?? profile?.email ?? '—'
  const photoUrl = profile?.photo_user
  const showPhoto = photoUrl && !photoError
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || displayName.charAt(0).toUpperCase()

  return (
    <div className="p-6 max-w-3xl">
      {message && (
        <div
          role="alert"
          className={`mb-6 flex items-center gap-3 rounded-[8px] border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-[#249689]/40 bg-[#249689]/5 text-[#249689]'
              : 'border-[#ff5963]/40 bg-[#ff5963]/5 text-[#ff5963]'
          }`}
        >
          {message.type === 'success' ? (
            <MdCheckCircle className="h-5 w-5 shrink-0" />
          ) : (
            <span className="h-5 w-5 shrink-0 rounded-full border-2 border-current" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className={card}>
        {/* Cabeçalho do perfil: avatar + nome + email + ação */}
        <div className="border-b border-[#E0E3E7] bg-[#f1f4f8]/50 px-6 py-6 sm:flex sm:items-center sm:gap-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#E0E3E7] bg-white shadow-sm ring-2 ring-white transition-[border-color,box-shadow] hover:border-[#1E3A8A] hover:ring-[#1E3A8A]/20 disabled:opacity-60"
            >
              {showPhoto ? (
                <span className="absolute inset-0 overflow-hidden rounded-full">
                  {/* img nativo evita restrições do Next/Image com URLs dinâmicas do Supabase */}
                  <img
                    src={photoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => setPhotoError(true)}
                  />
                </span>
              ) : (
                <span className="text-2xl font-semibold text-[#57636C]">{initials}</span>
              )}
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-[#14181B]/60 opacity-0 transition-opacity hover:opacity-100">
                <MdCameraAlt className="h-8 w-8 text-white" />
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handlePhotoChange}
            />
            <div className="text-center sm:text-left">
              <h2 className="text-lg font-semibold text-[#14181B]">{displayName}</h2>
              <p className="mt-0.5 text-sm text-[#57636C]">{displayEmail}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={`mt-3 ${buttonSecondary} text-xs`}
              >
                {uploading ? 'Enviando...' : 'Alterar foto'}
              </button>
            </div>
          </div>
        </div>

        {/* Dados pessoais */}
        <div className="px-6 py-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#57636C]">
            Dados pessoais
          </h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="flex items-center gap-2 text-xs font-medium text-[#57636C]">
                <MdPerson className="h-4 w-4" />
                Nome
              </dt>
              <dd className="mt-1 text-sm font-medium text-[#14181B]">{displayName}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-xs font-medium text-[#57636C]">
                <MdEmail className="h-4 w-4" />
                E-mail
              </dt>
              <dd className="mt-1 break-all text-sm font-medium text-[#14181B]">{displayEmail}</dd>
            </div>
          </dl>
        </div>

        {/* Ajuda */}
        <div className="rounded-b-[8px] border-t border-[#E0E3E7] bg-[#f1f4f8]/30 px-6 py-4">
          {/* Edição de e-mail: deve atualizar o Auth (supabase.auth.updateUser), pois o e-mail logado vem do Auth. */}
          <p className="flex items-start gap-2 text-xs text-[#57636C]">
            <MdInfoOutline className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Para alterar nome ou e-mail, fale com o administrador da empresa. Para alterar senha, acesse{' '}
              <Link href="/configuracoes" className="font-medium text-[#1E3A8A] hover:underline">
                Configurações
              </Link>
              .
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
