'use client'

import { Button } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { getProfile, updateProfilePhoto } from '@/lib/supabase/company'
import { uploadPhotoUser } from '@/lib/supabase/storage'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'

export default function Profile06Page() {
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getProfile>>>(null)
  const [authEmail, setAuthEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setAuthEmail(user?.email ?? null)
      const p = await getProfile()
      setProfile(p)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) throw new Error('Usuário não autenticado')
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `photo/${user.id}/${Date.now()}.${ext}`
      const url = await uploadPhotoUser(path, file)
      await updateProfilePhoto(url)
      setProfile((prev) => (prev ? { ...prev, photo_user: url } : null))
      setMessage({ type: 'success', text: 'Foto atualizada.' })
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

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-6">
        <p className="text-zinc-600">Carregando perfil...</p>
      </div>
    )
  }

  const displayName = profile?.name ?? authEmail ?? 'Usuário'
  const displayEmail = authEmail ?? profile?.email ?? '—'
  const photoUrl = profile?.photo_user

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Perfil</h1>

      <div className="mt-6 flex flex-col gap-6 rounded-[8px] border border-zinc-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-zinc-200 bg-zinc-100 hover:border-[#1E3A8A] hover:bg-zinc-50 disabled:opacity-50"
          >
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt="Foto do perfil"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <span className="text-2xl font-medium text-zinc-400">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handlePhotoChange}
            />
          </button>
          <div>
            <p className="text-sm text-zinc-500">
              {uploading ? 'Enviando...' : 'Clique na foto para alterar'}
            </p>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-lg font-medium text-zinc-900">{displayName}</p>
          <p className="text-sm text-zinc-600">{displayEmail}</p>
        </div>
      </div>

      {message && (
        <div
          className={`mt-4 rounded border px-4 py-2 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <p className="mt-4 text-sm text-zinc-500">
        Os dados de nome e e-mail vêm da sua conta (Auth) e da tabela company_users.
        A foto é armazenada no bucket <code className="rounded bg-zinc-100 px-1">photo_user</code> do Supabase.
      </p>
    </div>
  )
}
