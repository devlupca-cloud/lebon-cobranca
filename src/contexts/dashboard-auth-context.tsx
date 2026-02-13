'use client'

import { getMyProfileRpc } from '@/lib/supabase/company'
import type { Profile } from '@/lib/supabase/company'
import { createClient } from '@/lib/supabase/client'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type DashboardAuthState = {
  /** User do Auth (id + email). Carregado uma única vez no mount do dashboard. */
  user: { id: string; email: string | undefined } | null
  /** Perfil em company_users (company_id, name, email, photo_user). */
  profile: Profile | null
  loading: boolean
  error: Error | null
  /** Recarrega user + profile (útil após atualizar foto no perfil). */
  refetch: () => Promise<void>
}

const DashboardAuthContext = createContext<DashboardAuthState | null>(null)

/**
 * Provider que carrega user (auth) + profile (RPC get_my_profile) uma única vez
 * ao montar o dashboard. Header e useCompanyId consomem desse contexto,
 * evitando múltiplas chamadas a getUser e getProfile.
 */
export function DashboardAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string | undefined } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const loadStarted = useRef(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)
    setError(null)
    try {
      const [authResult, profileData] = await Promise.all([
        supabase.auth.getUser(),
        getMyProfileRpc(),
      ])
      const u = authResult.data?.user
      setUser(u ? { id: u.id, email: u.email ?? undefined } : null)
      setProfile(profileData ?? null)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (loadStarted.current) return
    loadStarted.current = true
    let cancelled = false
    load().then(() => {
      if (cancelled) return
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const value: DashboardAuthState = {
    user,
    profile,
    loading,
    error,
    refetch: load,
  }

  return (
    <DashboardAuthContext.Provider value={value}>
      {children}
    </DashboardAuthContext.Provider>
  )
}

export function useDashboardAuth(): DashboardAuthState {
  const ctx = useContext(DashboardAuthContext)
  if (ctx == null) {
    throw new Error('useDashboardAuth must be used within DashboardAuthProvider')
  }
  return ctx
}

/** Retorna o contexto ou null se fora do provider (evita quebrar uso fora do dashboard). */
export function useDashboardAuthOptional(): DashboardAuthState | null {
  return useContext(DashboardAuthContext)
}
