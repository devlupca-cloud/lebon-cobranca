'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type HeaderContextValue = {
  leftContent: ReactNode
  setLeftContent: (content: ReactNode) => void
  title: string
  setTitle: (title: string) => void
  breadcrumb: { label: string; href?: string }[]
  setBreadcrumb: (breadcrumb: { label: string; href?: string }[]) => void
}

const defaultValue: HeaderContextValue = {
  leftContent: null,
  setLeftContent: () => {},
  title: '',
  setTitle: () => {},
  breadcrumb: [],
  setBreadcrumb: () => {},
}

const HeaderContext = createContext<HeaderContextValue>(defaultValue)

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [leftContent, setLeftContentState] = useState<ReactNode>(null)
  const [title, setTitleState] = useState('')
  const [breadcrumb, setBreadcrumbState] = useState<{ label: string; href?: string }[]>([])
  
  const setLeftContent = useCallback((content: ReactNode) => {
    setLeftContentState(() => content)
  }, [])
  
  const setTitle = useCallback((newTitle: string) => {
    setTitleState(newTitle)
  }, [])
  
  const setBreadcrumb = useCallback((newBreadcrumb: { label: string; href?: string }[]) => {
    setBreadcrumbState(newBreadcrumb)
  }, [])
  
  return (
    <HeaderContext.Provider value={{ 
      leftContent, 
      setLeftContent, 
      title, 
      setTitle,
      breadcrumb,
      setBreadcrumb 
    }}>
      {children}
    </HeaderContext.Provider>
  )
}

export function useHeader() {
  return useContext(HeaderContext)
}

/**
 * Use useHeader() e no useEffect da página chame:
 * - setTitle('Nome da Página') para definir o título
 * - setBreadcrumb([{ label: 'Home', href: '/home' }, { label: 'Clientes' }]) para breadcrumb
 * - setLeftContent(conteúdo) para conteúdo customizado
 * 
 * No cleanup: return () => { setTitle(''); setBreadcrumb([]); setLeftContent(null) }
 */
