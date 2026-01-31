'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import {
  MdAccountCircle,
  MdBusiness,
  MdChevronLeft,
  MdChevronRight,
  MdClose,
  MdDocumentScanner,
  MdEditDocument,
  MdGridOn,
  MdGroups,
  MdLineAxis,
  MdSwapVert,
} from 'react-icons/md'

const STORAGE_KEY = 'sidebar-collapsed'

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
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) setCollapsed(stored === 'true')
    } catch {
      // ignore
    }
  }, [])

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-[#1E3A8A]/30 bg-[#1E3A8A] transition-[width] duration-200 ease-out ${
        collapsed ? 'w-[72px]' : 'w-[200px]'
      }`}
      aria-label="Menu principal"
    >
      <div
        className={`flex flex-col items-center gap-3 px-3 pt-6 pb-4 ${collapsed ? 'px-2' : 'px-4'}`}
      >
        <Link
          href="/home"
          className="block overflow-hidden rounded-full ring-2 ring-white/20 transition hover:ring-white/40"
          title="Lebon Cobranças"
        >
          <Image
            src="/Logo_lebon.jpg"
            alt="Lebon Cobranças"
            width={collapsed ? 40 : 48}
            height={collapsed ? 40 : 48}
            className={`object-cover ${collapsed ? 'h-10 w-10' : 'h-12 w-12'}`}
          />
        </Link>
        {!collapsed && (
          <div className="h-8 w-full rounded-[8px] bg-white/10 px-2 flex items-center justify-center">
            <span className="text-xs font-medium text-white/90 truncate w-full text-center">
              Lebon Cobranças
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          className={`mt-2 flex items-center justify-center rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white/90 ${
            collapsed ? 'w-8' : 'w-full gap-1'
          }`}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? (
            <MdChevronRight className="h-5 w-5" />
          ) : (
            <>
              <MdChevronLeft className="h-5 w-5 shrink-0" />
              <span className="text-xs">Recolher</span>
            </>
          )}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <ul className="flex flex-col gap-0.5">
          {SIDEBAR_LINKS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <li key={href}>
                <Link
                  href={href}
                  title={collapsed ? label : undefined}
                  className={`flex w-full items-center rounded-[8px] py-2.5 text-sm font-medium transition-colors ${
                    collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'
                  } ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="h-6 w-6 shrink-0 text-white" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
