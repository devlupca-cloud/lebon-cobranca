'use client'

import { getCompanyId } from '@/lib/supabase/company'
import { useEffect, useState } from 'react'

export function useCompanyId(): {
  companyId: string | null
  loading: boolean
  error: Error | null
} {
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    getCompanyId()
      .then((id) => {
        if (!cancelled) setCompanyId(id)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { companyId, loading, error }
}
