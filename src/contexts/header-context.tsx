'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type HeaderContextValue = {
  leftContent: ReactNode
  setLeftContent: (content: ReactNode) => void
}

const defaultValue: HeaderContextValue = {
  leftContent: null,
  setLeftContent: () => {},
}

const HeaderContext = createContext<HeaderContextValue>(defaultValue)

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [leftContent, setLeftContentState] = useState<ReactNode>(null)
  const setLeftContent = useCallback((content: ReactNode) => {
    setLeftContentState(() => content)
  }, [])
  return (
    <HeaderContext.Provider value={{ leftContent, setLeftContent }}>
      {children}
    </HeaderContext.Provider>
  )
}

export function useHeader() {
  return useContext(HeaderContext)
}

/**
 * Use useHeader() e no useEffect da página chame setLeftContent(conteúdo)
 * e no cleanup return () => setLeftContent(null) para manter uma única barra
 * com ações específicas por tela.
 */
