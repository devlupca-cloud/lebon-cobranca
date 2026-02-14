'use client'

import { LoadingScreen } from '@/components/ui'
import { useHeader } from '@/contexts/header-context'
import { useCompanyId } from '@/hooks/use-company-id'
import { card } from '@/lib/design'
import Link from 'next/link'
import { useEffect } from 'react'
import {
  MdAccountCircle,
  MdBusiness,
  MdChevronRight,
  MdNotifications,
  MdPeople,
  MdSecurity,
} from 'react-icons/md'

type SettingsItem = {
  href: string
  title: string
  description: string
  icon: React.ReactNode
  available: boolean
}

const SETTINGS_ITEMS: SettingsItem[] = [
  {
    href: '/profile06',
    title: 'Meu Perfil',
    description: 'Nome, e-mail, foto e dados pessoais',
    icon: <MdAccountCircle className="h-6 w-6 text-[#57636C]" />,
    available: true,
  },
  {
    href: '/cadastrar-acesso',
    title: 'Usuários e acessos',
    description: 'Gerenciar usuários e permissões da empresa',
    icon: <MdPeople className="h-6 w-6 text-[#57636C]" />,
    available: true,
  },
  {
    href: '/configuracoes/empresa',
    title: 'Empresa',
    description: 'Dados da empresa, CNPJ e endereço',
    icon: <MdBusiness className="h-6 w-6 text-[#57636C]" />,
    available: false,
  },
  {
    href: '/configuracoes/notificacoes',
    title: 'Notificações',
    description: 'Preferências de e-mail e alertas',
    icon: <MdNotifications className="h-6 w-6 text-[#57636C]" />,
    available: false,
  },
  {
    href: '/configuracoes/seguranca',
    title: 'Segurança',
    description: 'Alterar senha e opções de segurança',
    icon: <MdSecurity className="h-6 w-6 text-[#57636C]" />,
    available: false,
  },
]

export default function ConfiguracoesPage() {
  const { setTitle, setBreadcrumb } = useHeader()
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()

  useEffect(() => {
    setTitle('Configurações')
    setBreadcrumb([
      { label: 'Home', href: '/home' },
      { label: 'Configurações' },
    ])
    return () => {
      setTitle('')
      setBreadcrumb([])
    }
  }, [setTitle, setBreadcrumb])

  if (companyLoading) return <LoadingScreen />
  if (companyError || !companyId) {
    return (
      <div className="p-6">
        <p className="text-sm text-[#ff5963]">{companyError ?? 'Empresa não encontrada.'}</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {SETTINGS_ITEMS.map((item) => {
          const content = (
            <div className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] bg-[#f1f4f8]">
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#14181B]">{item.title}</p>
                <p className="text-xs text-[#57636C] mt-0.5">{item.description}</p>
              </div>
              {item.available ? (
                <MdChevronRight className="h-5 w-5 shrink-0 text-[#57636C]" />
              ) : (
                <span className="shrink-0 rounded-[8px] bg-[#E0E3E7] px-2 py-0.5 text-xs font-medium text-[#57636C]">
                  Em breve
                </span>
              )}
            </div>
          )

          return (
            <div key={item.href} className={card}>
              {item.available ? (
                <Link
                  href={item.href}
                  className="block transition-colors hover:bg-[#f8fafc] rounded-[8px]"
                >
                  {content}
                </Link>
              ) : (
                <div className="cursor-not-allowed opacity-80">{content}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
