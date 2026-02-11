'use client'

import { LoadingScreen } from '@/components/ui'
import { getOverdueInstallments } from '@/lib/supabase/installments'
import type { OverdueInstallmentRow } from '@/lib/supabase/installments'
import { getOverdueSummary } from '@/lib/supabase/reports'
import type { OverdueBucket } from '@/lib/supabase/reports'
import { useCompanyId } from '@/hooks/use-company-id'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
}

export default function InadimplentesPage() {
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()
  const [rows, setRows] = useState<OverdueInstallmentRow[]>([])
  const [buckets, setBuckets] = useState<OverdueBucket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOverdue = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const [list, summary] = await Promise.all([
        getOverdueInstallments(companyId),
        getOverdueSummary(companyId),
      ])
      setRows(list)
      setBuckets(summary)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar inadimplentes.')
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    if (!companyId) return
    fetchOverdue()
  }, [companyId, fetchOverdue])

  const totalOverdue = rows.reduce((sum, r) => sum + (r.amount - r.amount_paid), 0)
  const over90Count = rows.filter((r) => daysOverdue(r.due_date) >= 90).length

  if (companyLoading) return <LoadingScreen message="Carregando..." />
  if (companyError || !companyId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Inadimplentes</h1>
        <p className="mt-2 text-amber-600">
          Configure sua empresa (company_users) para acessar esta tela.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Inadimplentes</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Parcelas vencidas e não quitadas
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Card resumo (estilo Flutter: gradiente vermelho) */}
      <div
        className="mb-8 rounded-[8px] px-6 py-6 text-white shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Inadimplentes</h2>
            <p className="mt-1 text-sm text-white/90">
              Clientes com +90 dias em atraso: {over90Count} parcela(s)
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <svg
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>
        <div className="mt-6 border-t border-white/20 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-white/90">
            Total em atraso
          </p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(totalOverdue)}</p>
        </div>
      </div>

      {/* Faixas de atraso (getOverdueSummary) */}
      {buckets.length > 0 && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {buckets.map((b) => (
            <div
              key={b.range}
              className="rounded-[8px] border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-medium uppercase text-zinc-500">
                {b.range} dias em atraso
              </p>
              <p className="mt-1 text-lg font-semibold text-zinc-900">
                {formatCurrency(b.total)}
              </p>
              <p className="mt-0.5 text-sm text-zinc-600">
                {b.count} parcela(s)
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[8px] border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h3 className="font-semibold text-zinc-900">Lista de Inadimplentes</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-zinc-500">
            Nenhuma parcela inadimplente no momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">
                    Contrato
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">
                    Parcela
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">
                    Vencimento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">
                    Dias em atraso
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500">
                    Valor em aberto
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {rows.map((row) => {
                  const contract = row.contracts ?? row.contract
                  const customerName = contract?.customers?.full_name ?? '—'
                  const contractNumber = contract?.contract_number ?? '—'
                  const openAmount = row.amount - row.amount_paid
                  const days = daysOverdue(row.due_date)
                  return (
                    <tr key={row.id} className="hover:bg-zinc-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-900">
                        {customerName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600">
                        {contractNumber}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600">
                        {row.installment_number}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600">
                        {formatDate(row.due_date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={
                            days >= 90
                              ? 'rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800'
                              : 'text-sm text-zinc-600'
                          }
                        >
                          {days} dias
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-zinc-900">
                        {formatCurrency(openAmount)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Link
          href="/home"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          ← Voltar
        </Link>
      </div>
    </div>
  )
}
