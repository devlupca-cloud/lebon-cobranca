'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  MdAccountCircle,
  MdBusiness,
  MdClose,
  MdDocumentScanner,
  MdEditDocument,
  MdGridOn,
  MdGroups,
  MdLineAxis,
  MdSwapVert,
} from 'react-icons/md'

const SIDEBAR_LINKS = [
  { href: '/clientes', label: 'Clientes', icon: MdBusiness },
  { href: '/inadimplentes01', label: 'Inadimplêntes', icon: MdClose },
  { href: '/contratos', label: 'Contrato', icon: MdDocumentScanner },
  { href: '/gerardocumentosnovo', label: 'Gerar Documentos', icon: MdEditDocument },
  { href: '/simulacao', label: 'Simulação', icon: MdSwapVert },
  { href: '/fluxo-caixa', label: 'Contas a pagar', icon: MdGridOn },
  { href: '/extrato-fianceiro', label: 'Extrato Financeiro', icon: MdLineAxis },
  { href: '/cadastrar-acesso', label: 'Cadastrar Acesso', icon: MdGroups },
  { href: '/profile06', label: 'Perfil', icon: MdAccountCircle },
] as const

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="flex h-full w-[260px] shrink-0 flex-col border-r border-[#1E3A8A]/30 bg-[#1E3A8A]"
      aria-label="Menu principal"
    >
      <div className="flex flex-col items-center gap-3 px-4 pt-6 pb-4">
        <Link href="/home" className="block overflow-hidden rounded-full ring-2 ring-white/20 transition hover:ring-white/40">
          <Image
            src="/Logo_lebon.jpg"
            alt="Lebon Cobranças"
            width={56}
            height={56}
            className="h-14 w-14 object-cover"
          />
        </Link>
        <div className="h-8 w-full rounded-lg bg-white/10 px-3 flex items-center justify-center">
          <span className="text-xs font-medium text-white/90 truncate w-full text-center">Lebon Cobranças</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        <ul className="flex flex-col gap-0.5">
          {SIDEBAR_LINKS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="h-6 w-6 shrink-0 text-white" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
