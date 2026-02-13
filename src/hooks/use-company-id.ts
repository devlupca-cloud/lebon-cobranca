'use client'

import { useDashboardAuthOptional } from '@/contexts/dashboard-auth-context'
import { getCompanyId } from '@/lib/supabase/company'
import { useEffect, useState } from 'react'

/**
 * Retorna o company_id do usuário. Dentro do dashboard usa o contexto
 * (uma única carga user + profile); fora do dashboard faz getCompanyId().
 */
export function useCompanyId(): {
  companyId: string | null
  loading: boolean
  error: Error | null
} {
  const auth = useDashboardAuthOptional()
  const [legacyCompanyId, setLegacyCompanyId] = useState<string | null>(null)
  const [legacyLoading, setLegacyLoading] = useState(!auth)
  const [legacyError, setLegacyError] = useState<Error | null>(null)

  useEffect(() => {
    if (auth) return
    let cancelled = false
    getCompanyId()
      .then((id) => {
        if (!cancelled) setLegacyCompanyId(id)
      })
      .catch((e) => {
        if (!cancelled) setLegacyError(e instanceof Error ? e : new Error(String(e)))
      })
      .finally(() => {
        if (!cancelled) setLegacyLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [auth])

  if (auth) {
    return {
      companyId: auth.profile?.company_id ?? null,
      loading: auth.loading,
      error: auth.error,
    }
  }
  return {
    companyId: legacyCompanyId,
    loading: legacyLoading,
    error: legacyError,
  }
}
