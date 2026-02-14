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
  { href: '/extrato-financeiro', label: 'Extrato Financeiro', icon: MdLineAxis },
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
      className={`relative flex h-full shrink-0 flex-col border-r border-[#E0E3E7] bg-[#1E3A8A] transition-[width] duration-300 ease-in-out ${
        collapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
      aria-label="Menu principal"
    >
      {/* Header com logo e nome */}
      <div className={`flex flex-col items-center gap-3 px-4 pt-6 pb-5 border-b border-white/10 ${collapsed ? 'px-3' : ''}`}>
        <Link
          href="/home"
          prefetch={false}
          className="block overflow-hidden rounded-full ring-2 ring-white/20 transition-all duration-200 hover:ring-white/40 hover:scale-105"
          title="Lebon Cobranças"
        >
          <Image
            src="/Logo_lebon.jpg"
            alt="Lebon Cobranças"
            width={collapsed ? 44 : 56}
            height={collapsed ? 44 : 56}
            className={`object-cover transition-all duration-300 ${collapsed ? 'h-11 w-11' : 'h-14 w-14'}`}
          />
        </Link>
        {!collapsed && (
          <div className="w-full text-center animate-in fade-in slide-in-from-left-2 duration-200">
            <h2 className="text-base font-semibold text-white tracking-tight">
              Lebon Cobranças
            </h2>
            <p className="text-xs text-white/60 mt-0.5">
              Sistema de Gestão
            </p>
          </div>
        )}
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <ul className="flex flex-col gap-1">
          {SIDEBAR_LINKS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <li key={href}>
                <Link
                  href={href}
                  prefetch={false}
                  title={collapsed ? label : undefined}
                  className={`group flex w-full items-center rounded-[8px] py-2.5 text-sm font-medium transition-all duration-200 ${
                    collapsed ? 'justify-center px-2' : 'gap-3 px-3'
                  } ${
                    isActive
                      ? 'bg-white text-[#1E3A8A] shadow-sm'
                      : 'text-white/90 hover:bg-white/10 hover:text-white hover:translate-x-0.5'
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 transition-transform duration-200 ${
                    isActive ? 'text-[#1E3A8A]' : 'text-white/90 group-hover:scale-110'
                  }`} />
                  {!collapsed && (
                    <span className="truncate animate-in fade-in slide-in-from-left-1 duration-150">
                      {label}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Botão de toggle - fixo no rodapé */}
      <div className={`border-t border-white/10 p-3 ${collapsed ? 'px-2' : ''}`}>
        <button
          type="button"
          onClick={toggle}
          className={`flex w-full items-center justify-center rounded-[8px] py-2.5 text-sm font-medium text-white/90 transition-all duration-200 hover:bg-white/10 hover:text-white hover:scale-105 active:scale-95 ${
            collapsed ? 'px-2' : 'gap-2 px-3'
          }`}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? (
            <MdChevronRight className="h-5 w-5" />
          ) : (
            <>
              <MdChevronLeft className="h-5 w-5" />
              <span className="text-xs animate-in fade-in slide-in-from-left-1 duration-150">
                Recolher
              </span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
