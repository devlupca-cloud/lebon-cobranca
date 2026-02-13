'use client'

import { LoadingScreen } from '@/components/ui'
import { useHeader } from '@/contexts/header-context'
import { getFinancialSummary } from '@/lib/supabase/reports'
import type { FinancialSummary } from '@/lib/supabase/reports'
import { useCompanyId } from '@/hooks/use-company-id'
import { card, pageSubtitle } from '@/lib/design'
import { useCallback, useEffect, useState } from 'react'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export default function ExtratoFianceiroPage() {
  const { setTitle, setBreadcrumb } = useHeader()
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTitle('Extrato Financeiro')
    setBreadcrumb([{ label: 'Home', href: '/home' }, { label: 'Extrato Financeiro' }])
    return () => {
      setTitle('')
      setBreadcrumb([])
    }
  }, [setTitle, setBreadcrumb])

  const fetchSummary = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getFinancialSummary(companyId)
      setSummary(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar resumo.')
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    if (!companyId) return
    fetchSummary()
  }, [companyId, fetchSummary])

  if (companyLoading) return <LoadingScreen message="Carregando..." />
  if (companyError || !companyId) {
    return (
      <div className="p-6">
        <p className="text-amber-600">
          Configure sua empresa (company_users) para acessar esta tela.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <p className={pageSubtitle}>
        Resumo financeiro da empresa
      </p>

      {error && (
        <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E3A8A] border-t-transparent" />
        </div>
      ) : summary ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className={card + ' p-6'}>
            <p className="text-sm font-medium text-[#57636C]">Total a receber</p>
            <p className="mt-2 text-2xl font-semibold text-[#14181B]">{formatCurrency(summary.totalReceivable)}</p>
            <p className="mt-1 text-xs text-[#57636C]">Soma do valor das parcelas</p>
          </div>
          <div className={card + ' p-6'}>
            <p className="text-sm font-medium text-[#57636C]">Total recebido</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-600">{formatCurrency(summary.totalReceived)}</p>
            <p className="mt-1 text-xs text-[#57636C]">Valor já pago nas parcelas</p>
          </div>
          <div className={card + ' p-6'}>
            <p className="text-sm font-medium text-[#57636C]">Inadimplente</p>
            <p className="mt-2 text-2xl font-semibold text-red-600">{formatCurrency(summary.totalOverdue)}</p>
            <p className="mt-1 text-xs text-[#57636C]">Parcelas vencidas em aberto</p>
          </div>
          <div className={card + ' p-6'}>
            <p className="text-sm font-medium text-[#57636C]">Contratos</p>
            <p className="mt-2 text-2xl font-semibold text-[#14181B]">
              {summary.activeContracts} ativos / {summary.closedContracts} encerrados
            </p>
            <p className="mt-1 text-xs text-[#57636C]">Resumo por status</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
