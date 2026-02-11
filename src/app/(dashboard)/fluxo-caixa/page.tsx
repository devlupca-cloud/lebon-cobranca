'use client'

import { LoadingScreen } from '@/components/ui'
import { getCashFlowForecast, getFinancialSummary } from '@/lib/supabase/reports'
import type { CashFlowMonth, FinancialSummary } from '@/lib/supabase/reports'
import { useCompanyId } from '@/hooks/use-company-id'
import { card, pageTitle, pageSubtitle, tableHead, tableCell, tableCellMuted } from '@/lib/design'
import { useCallback, useEffect, useState } from 'react'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatMonth(month: string) {
  const [y, m] = month.split('-')
  const date = new Date(Number(y), Number(m) - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export default function FluxoCaixaPage() {
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [cashFlow, setCashFlow] = useState<CashFlowMonth[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 6)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 6)
    return d.toISOString().split('T')[0]
  })

  const fetchData = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const [sum, flow] = await Promise.all([
        getFinancialSummary(companyId),
        getCashFlowForecast(companyId, startDate, endDate),
      ])
      setSummary(sum)
      setCashFlow(flow)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }, [companyId, startDate, endDate])

  useEffect(() => {
    if (!companyId) return
    fetchData()
  }, [companyId, fetchData])

  if (companyLoading) return <LoadingScreen message="Carregando..." />
  if (companyError || !companyId) {
    return (
      <div className="p-6">
        <h1 className={pageTitle}>Fluxo de Caixa</h1>
        <p className="mt-2 text-amber-600">
          Configure sua empresa (company_users) para acessar esta tela.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className={pageTitle}>Fluxo de Caixa</h1>
      <p className={pageSubtitle}>
        Previsão de entradas por mês (previsto x recebido)
      </p>

      {/* Period filter */}
      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-[#14181B]">De</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-[8px] border border-[#E0E3E7] bg-[#f1f4f8] py-2.5 px-3 text-sm focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A]"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[#14181B]">Até</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-[8px] border border-[#E0E3E7] bg-[#f1f4f8] py-2.5 px-3 text-sm focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A]"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E3A8A] border-t-transparent" />
        </div>
      ) : (
        <>
          {summary && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className={card + ' p-4'}>
                <p className="text-xs font-medium uppercase text-[#57636C]">A receber (total)</p>
                <p className="mt-1 text-xl font-semibold text-[#14181B]">{formatCurrency(summary.totalReceivable)}</p>
              </div>
              <div className={card + ' p-4'}>
                <p className="text-xs font-medium uppercase text-[#57636C]">Recebido</p>
                <p className="mt-1 text-xl font-semibold text-emerald-600">{formatCurrency(summary.totalReceived)}</p>
              </div>
              <div className={card + ' p-4'}>
                <p className="text-xs font-medium uppercase text-[#57636C]">Inadimplente</p>
                <p className="mt-1 text-xl font-semibold text-red-600">{formatCurrency(summary.totalOverdue)}</p>
              </div>
              <div className={card + ' p-4'}>
                <p className="text-xs font-medium uppercase text-[#57636C]">Contratos ativos</p>
                <p className="mt-1 text-xl font-semibold text-[#14181B]">{summary.activeContracts}</p>
              </div>
            </div>
          )}

          <div className={card + ' mt-8 overflow-hidden'}>
            <div className="border-b border-[#E0E3E7] px-4 py-3">
              <h2 className="font-semibold text-[#14181B]">Previsão por mês</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E0E3E7]">
                <thead>
                  <tr className={tableHead}>
                    <th className="px-4 py-3 text-left">Mês</th>
                    <th className="px-4 py-3 text-right">Previsto</th>
                    <th className="px-4 py-3 text-right">Recebido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E0E3E7] bg-white">
                  {cashFlow.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-[#57636C]">
                        Nenhum dado no período.
                      </td>
                    </tr>
                  ) : (
                    cashFlow.map((row) => (
                      <tr key={row.month} className="hover:bg-[#f1f4f8]">
                        <td className={tableCell}>{formatMonth(row.month)}</td>
                        <td className={tableCellMuted + ' text-right'}>{formatCurrency(row.expected)}</td>
                        <td className={tableCell + ' text-right font-medium'}>{formatCurrency(row.received)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
