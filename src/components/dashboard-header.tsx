'use client'

import { useDashboardAuth } from '@/contexts/dashboard-auth-context'
import { useHeader } from '@/contexts/header-context'
import { signOut } from '@/lib/auth'
import type { Profile } from '@/lib/supabase/company'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { MdNotifications, MdExpandMore, MdLogout, MdAccountCircle, MdSettings, MdChevronRight } from 'react-icons/md'
import Link from 'next/link'

/** Iniciais para o avatar: até 2 letras a partir do nome ou email */
function getInitials(profile: Profile | null, authEmail: string | null): string {
  const name = profile?.name?.trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2)
    }
    return name.slice(0, 2).toUpperCase()
  }
  const email = profile?.email ?? authEmail ?? ''
  const local = email.split('@')[0] ?? ''
  if (local.length >= 2) return local.slice(0, 2).toUpperCase()
  return local ? local[0].toUpperCase() : '?'
}

export function DashboardHeader() {
  const router = useRouter()
  const { leftContent, title, breadcrumb } = useHeader()
  const { user, profile } = useDashboardAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const authEmail = user?.email ?? null

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[#E0E3E7] bg-white px-6 shadow-sm">
      {/* Lado esquerdo - Conteúdo dinâmico por página */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {leftContent ? (
          leftContent
        ) : (
          <div className="min-w-0">
            {/* Breadcrumb */}
            {breadcrumb.length > 0 && (
              <nav className="flex items-center gap-1 mb-1" aria-label="Breadcrumb">
                {breadcrumb.map((item, index) => (
                  <div key={index} className="flex items-center gap-1">
                    {index > 0 && (
                      <MdChevronRight className="h-4 w-4 text-[#57636C]" />
                    )}
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="text-xs font-medium text-[#57636C] hover:text-[#1E3A8A] transition-colors"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span className="text-xs font-medium text-[#14181B]">
                        {item.label}
                      </span>
                    )}
                  </div>
                ))}
              </nav>
            )}
            {/* Título */}
            <h1 className="text-xl font-semibold text-[#14181B] truncate">
              {title || 'Dashboard'}
            </h1>
          </div>
        )}
      </div>

      {/* Lado direito - Ações globais */}
      <div className="flex items-center gap-3">
        {/* Notificações */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-10 w-10 items-center justify-center rounded-[8px] text-[#57636C] transition-colors hover:bg-[#f1f4f8] hover:text-[#14181B]"
            title="Notificações"
            aria-label="Notificações"
          >
            <MdNotifications className="h-6 w-6" />
            {/* Badge de notificações não lidas */}
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff5963] opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff5963]"></span>
            </span>
          </button>

          {/* Dropdown de notificações */}
          {showNotifications && (
            <div className="absolute right-0 top-12 z-50 w-80 rounded-[8px] border border-[#E0E3E7] bg-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="border-b border-[#E0E3E7] px-4 py-3">
                <h3 className="text-sm font-semibold text-[#14181B]">Notificações</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {/* Exemplo de notificação */}
                <div className="border-b border-[#E0E3E7] px-4 py-3 hover:bg-[#f1f4f8] transition-colors cursor-pointer">
                  <p className="text-sm font-medium text-[#14181B]">Nova cobrança vencida</p>
                  <p className="text-xs text-[#57636C] mt-1">Cliente João Silva - R$ 1.500,00</p>
                  <p className="text-xs text-[#57636C] mt-1">Há 2 horas</p>
                </div>
                <div className="border-b border-[#E0E3E7] px-4 py-3 hover:bg-[#f1f4f8] transition-colors cursor-pointer">
                  <p className="text-sm font-medium text-[#14181B]">Pagamento recebido</p>
                  <p className="text-xs text-[#57636C] mt-1">Cliente Maria Santos - R$ 850,00</p>
                  <p className="text-xs text-[#57636C] mt-1">Há 4 horas</p>
                </div>
                <div className="px-4 py-3 text-center">
                  <button className="text-sm font-medium text-[#1E3A8A] hover:underline">
                    Ver todas
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Separador */}
        <div className="h-6 w-px bg-[#E0E3E7]"></div>

        {/* Menu do usuário */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 rounded-[8px] px-3 py-2 transition-colors hover:bg-[#f1f4f8] group"
            aria-label="Menu do usuário"
          >
            {/* Avatar */}
            {profile?.photo_user ? (
              <img
                src={profile.photo_user}
                alt=""
                className="h-8 w-8 rounded-full object-cover ring-2 ring-white shadow-sm"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E3A8A] text-sm font-semibold text-white ring-2 ring-white shadow-sm">
                {getInitials(profile, authEmail)}
              </div>
            )}
            {/* Nome e email */}
            <div className="hidden md:block text-left min-w-0">
              <p className="text-sm font-medium text-[#14181B] leading-tight truncate">
                {profile?.name ?? profile?.email ?? authEmail ?? 'Usuário'}
              </p>
              <p className="text-xs text-[#57636C] leading-tight truncate">
                {profile?.email ?? authEmail ?? 'Lebon Cobranças'}
              </p>
            </div>
            <MdExpandMore className={`h-5 w-5 text-[#57636C] transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown do perfil */}
          {showDropdown && (
            <div className="absolute right-0 top-12 z-50 w-56 rounded-[8px] border border-[#E0E3E7] bg-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="border-b border-[#E0E3E7] px-4 py-3">
                <p className="text-sm font-semibold text-[#14181B] truncate">
                  {profile?.name ?? profile?.email ?? authEmail ?? 'Minha Conta'}
                </p>
                <p className="text-xs text-[#57636C] mt-0.5 truncate">
                  {profile?.email ?? authEmail ?? '—'}
                </p>
              </div>
              <div className="py-2">
                <button
                  type="button"
                  onClick={() => {
                    router.push('/profile06')
                    setShowDropdown(false)
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#14181B] transition-colors hover:bg-[#f1f4f8]"
                >
                  <MdAccountCircle className="h-5 w-5 text-[#57636C]" />
                  Meu Perfil
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Navegar para configurações
                    setShowDropdown(false)
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#14181B] transition-colors hover:bg-[#f1f4f8]"
                >
                  <MdSettings className="h-5 w-5 text-[#57636C]" />
                  Configurações
                </button>
              </div>
              <div className="border-t border-[#E0E3E7] py-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#ff5963] transition-colors hover:bg-[#f1f4f8]"
                >
                  <MdLogout className="h-5 w-5" />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
