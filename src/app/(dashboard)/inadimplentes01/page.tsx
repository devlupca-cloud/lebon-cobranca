'use client'

import { LoadingScreen } from '@/components/ui'
import { useCompanyId } from '@/hooks/use-company-id'
import { getOverdueInstallments } from '@/lib/supabase/installments'
import type { OverdueInstallmentRow } from '@/lib/supabase/installments'
import { buttonPrimary, buttonSecondary, card, input, pageTitle } from '@/lib/design'
import { formatCPFOrCNPJ } from '@/lib/format'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { MdDescription, MdSearch, MdWarning } from 'react-icons/md'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)))
}

/** Um contrato agrupado com totais e dados para o card */
type ContractOverdueCard = {
  contractId: string
  contractNumber: string | null
  customerName: string
  cpf: string | null
  cnpj: string | null
  personType: string
  contractAmount: number | null
  installmentAmount: number | null
  installmentsCount: number
  totalOpen: number
  maxDaysOverdue: number
  situacaoLabel: string
}

const SITUACAO_OPTIONS = [
  { value: '', label: 'Por Situação' },
  { value: '90+', label: '90+ dias' },
  { value: '61-90', label: '61-90 dias' },
  { value: '31-60', label: '31-60 dias' },
  { value: '1-30', label: '1-30 dias' },
] as const

const DATA_OPTIONS = [
  { value: '', label: 'Por Data' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: '180', label: 'Últimos 180 dias' },
  { value: '365', label: 'Último ano' },
] as const

function situacaoFromDays(days: number): string {
  if (days >= 90) return 'Ag. Citação'
  return 'Acordo'
}

function bucketFromDays(days: number): string {
  if (days > 90) return '90+'
  if (days > 60) return '61-90'
  if (days > 30) return '31-60'
  return '1-30'
}

function groupRowsByContract(rows: OverdueInstallmentRow[]): ContractOverdueCard[] {
  const byContract = new Map<
    string,
    {
      rows: OverdueInstallmentRow[]
      contractNumber: string | null
      customerName: string
      cpf: string | null
      cnpj: string | null
      personType: string
      contractAmount: number | null
      installmentAmount: number | null
      installmentsCount: number
    }
  >()

  for (const row of rows) {
    const contract = row.contracts ?? row.contract
    const customer = contract?.customers
    const name = customer?.full_name ?? customer?.legal_name ?? '—'
    const existing = byContract.get(row.contract_id)
    if (!existing) {
      byContract.set(row.contract_id, {
        rows: [row],
        contractNumber: contract?.contract_number ?? null,
        customerName: name,
        cpf: customer?.cpf ?? null,
        cnpj: customer?.cnpj ?? null,
        personType: customer?.person_type ?? 'PF',
        contractAmount: contract?.contract_amount ?? null,
        installmentAmount: contract?.installment_amount ?? null,
        installmentsCount: contract?.installments_count ?? contract?.total_installments ?? 0,
      })
    } else {
      existing.rows.push(row)
    }
  }

  const cards: ContractOverdueCard[] = []
  for (const [contractId, data] of byContract.entries()) {
    let totalOpen = 0
    let maxDays = 0
    for (const r of data.rows) {
      totalOpen += r.amount - r.amount_paid
      maxDays = Math.max(maxDays, daysOverdue(r.due_date))
    }
    cards.push({
      contractId,
      contractNumber: data.contractNumber,
      customerName: data.customerName,
      cpf: data.cpf,
      cnpj: data.cnpj,
      personType: data.personType,
      contractAmount: data.contractAmount,
      installmentAmount: data.installmentAmount,
      installmentsCount: data.installmentsCount,
      totalOpen,
      maxDaysOverdue: maxDays,
      situacaoLabel: situacaoFromDays(maxDays),
    })
  }
  return cards.sort((a, b) => b.maxDaysOverdue - a.maxDaysOverdue)
}

export default function InadimplentesPage() {
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()
  const [rows, setRows] = useState<OverdueInstallmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterSituacao, setFilterSituacao] = useState('')
  const [filterData, setFilterData] = useState('')

  const fetchOverdue = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const list = await getOverdueInstallments(companyId)
      setRows(list)
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

  const cards = useMemo(() => groupRowsByContract(rows), [rows])

  const totalOverdue = useMemo(() => cards.reduce((s, c) => s + c.totalOpen, 0), [cards])
  const clientesCount = cards.length
  const clientes90Plus = useMemo(
    () => cards.filter((c) => c.maxDaysOverdue >= 90).length,
    [cards]
  )

  const filteredCards = useMemo(() => {
    let list = cards

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (c) =>
          c.customerName.toLowerCase().includes(q) ||
          (c.contractNumber?.toLowerCase().includes(q) ?? false)
      )
    }

    if (filterSituacao) {
      list = list.filter((c) => bucketFromDays(c.maxDaysOverdue) === filterSituacao)
    }

    if (filterData) {
      const days = Number(filterData)
      if (Number.isFinite(days)) {
        const since = new Date()
        since.setDate(since.getDate() - days)
        const sinceStr = since.toISOString().slice(0, 10)
        list = list.filter((c) => {
          const anyRow = rows.find((r) => r.contract_id === c.contractId)
          return anyRow && anyRow.due_date >= sinceStr
        })
      }
    }

    return list
  }, [cards, search, filterSituacao, filterData, rows])

  if (companyLoading) return <LoadingScreen message="Carregando..." />
  if (companyError || !companyId) {
    return (
      <div className="p-6">
        <h1 className={pageTitle}>Inadimplentes</h1>
        <p className="mt-2 text-amber-600">
          Configure sua empresa (company_users) para acessar esta tela.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className={pageTitle}>Inadimplentes</h1>
        <Link href="/home" className={buttonSecondary}>
          ← Voltar
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Card resumo vermelho */}
      <div
        className="mb-8 flex flex-wrap items-start justify-between gap-6 rounded-[8px] px-6 py-6 text-white shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
        }}
      >
        <div className="flex-1">
          <h2 className="text-xl font-bold">Inadimplentes</h2>
          <p className="mt-1 text-sm text-white/90">
            Clientes com +90 dias em atraso
          </p>
          <div className="mt-4 flex flex-wrap gap-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-white/90">
                Total em Atraso
              </p>
              <p className="mt-1 text-2xl font-bold">{formatCurrency(totalOverdue)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-white/90">
                Clientes
              </p>
              <p className="mt-1 text-2xl font-bold">{clientes90Plus}</p>
            </div>
          </div>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20">
          <MdWarning className="h-7 w-7" aria-hidden />
        </div>
      </div>

      {/* Busca e filtros */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MdSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#57636C]" aria-hidden />
          <input
            type="search"
            className={input + ' pl-10'}
            placeholder="Buscar cliente ou processo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={input + ' w-auto min-w-[140px]'}
          value={filterSituacao}
          onChange={(e) => setFilterSituacao(e.target.value)}
        >
          {SITUACAO_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className={input + ' w-auto min-w-[140px]'}
          value={filterData}
          onChange={(e) => setFilterData(e.target.value)}
        >
          {DATA_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button type="button" className={buttonPrimary} disabled>
          <MdDescription className="h-5 w-5" aria-hidden />
          Relatórios
        </button>
      </div>

      {/* Lista de inadimplentes em cards */}
      <h3 className="mb-4 font-semibold text-[#14181B]">Lista de Inadimplentes</h3>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E3A8A] border-t-transparent" />
        </div>
      ) : filteredCards.length === 0 ? (
        <div className={card + ' py-12 text-center text-[#57636C]'}>
          Nenhum cliente inadimplente no momento.
        </div>
      ) : (
        <ul className="space-y-4">
          {filteredCards.map((c) => (
            <li key={c.contractId} className={card + ' p-5'}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#14181B]">{c.customerName}</p>
                  <p className="mt-0.5 text-sm text-[#57636C]">
                    Processo: {c.contractNumber ?? '—'}
                  </p>
                  <p className="mt-0.5 text-sm text-[#57636C]">
                    CPF: {formatCPFOrCNPJ(c.cpf, c.cnpj)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4">
                    <span className="font-semibold text-red-600">
                      Valor Original: {formatCurrency(c.contractAmount ?? 0)}
                    </span>
                    <span className="font-semibold text-[#1E3A8A]">
                      Parcelamento: {c.installmentsCount}x {formatCurrency(c.installmentAmount ?? 0)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                    {c.maxDaysOverdue} dias
                  </span>
                  <span
                    className={
                      c.situacaoLabel === 'Ag. Citação'
                        ? 'rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800'
                        : 'rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800'
                    }
                  >
                    {c.situacaoLabel}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-[#E0E3E7] pt-4">
                <Link
                  href={`/detalhes-contrato/${c.contractId}`}
                  className={buttonPrimary}
                >
                  {c.maxDaysOverdue >= 90 ? 'Acordo' : 'Renegociar'}
                </Link>
                <Link
                  href={`/detalhes-contrato/${c.contractId}`}
                  className={buttonSecondary}
                >
                  Detalhes
                </Link>
                <Link
                  href={`/gerardocumentosnovo?contractId=${c.contractId}`}
                  className={buttonSecondary}
                >
                  Gerar PDF
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
