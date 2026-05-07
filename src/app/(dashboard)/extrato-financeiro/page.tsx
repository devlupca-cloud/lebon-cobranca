'use client'

import { LoadingScreen } from '@/components/ui'
import { useHeader } from '@/contexts/header-context'
import { getExtratoFinanceiroData, getRecentMovements } from '@/lib/supabase/reports'
import type { ExtratoFinanceiroData, RecentMovement, MovementType } from '@/lib/supabase/reports'
import { getContractsFiltered } from '@/lib/supabase/contracts'
import { getOverdueInstallments } from '@/lib/supabase/installments'
import { calculateOverdueValue } from '@/lib/installments-overdue'
import type { ContractWithRelations, GetContractsResponse } from '@/types/database'
import { CONTRACT_STATUS } from '@/types/enums'
import { useCompanyId } from '@/hooks/use-company-id'
import { card, input, tableHead, tableCell, tableCellMuted, buttonPrimary } from '@/lib/design'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MdTrendingUp,
  MdAccessTime,
  MdDescription,
  MdSearch,
  MdVisibility,
  MdAccountBalanceWallet,
  MdArrowDownward,
  MdArrowUpward,
  MdPayment,
} from 'react-icons/md'
import { PopupQuitacao } from '@/components/popup-quitacao'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function getCustomerName(contract: ContractWithRelations): string {
  return contract.customer?.full_name || contract.customer?.legal_name || contract.customer?.trade_name || '—'
}

/** Formata data ISO para exibição relativa (Hoje, Ontem, X dias atrás) + horário */
function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))

  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (diffDays === 0) return `Hoje, ${time}`
  if (diffDays === 1) return `Ontem, ${time}`
  if (diffDays < 0) return `Em ${Math.abs(diffDays)} dia${Math.abs(diffDays) > 1 ? 's' : ''}`
  if (diffDays <= 7) return `${diffDays} dias atrás, ${time}`
  return formatDate(iso.split('T')[0])
}

const MOVEMENT_CONFIG: Record<MovementType, {
  iconClass: string
  amountClass: string
  prefix: string
  Icon: typeof MdArrowDownward
}> = {
  payment: {
    iconClass: 'bg-emerald-100 text-emerald-600',
    amountClass: 'text-emerald-600',
    prefix: '+ ',
    Icon: MdArrowDownward,
  },
  new_contract: {
    iconClass: 'bg-emerald-100 text-emerald-600',
    amountClass: 'text-emerald-600',
    prefix: '+ ',
    Icon: MdArrowDownward,
  },
  expense: {
    iconClass: 'bg-red-100 text-red-500',
    amountClass: 'text-red-500',
    prefix: '- ',
    Icon: MdArrowUpward,
  },
  installment: {
    iconClass: 'bg-blue-100 text-blue-600',
    amountClass: 'text-blue-600',
    prefix: '',
    Icon: MdAccessTime,
  },
}

export default function ExtratoFinanceiroPage() {
  const router = useRouter()
  const { setTitle, setBreadcrumb } = useHeader()
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()

  const [extrato, setExtrato] = useState<ExtratoFinanceiroData | null>(null)
  const [contracts, setContracts] = useState<GetContractsResponse | null>(null)
  const [movements, setMovements] = useState<RecentMovement[]>([])
  /** Parcelas atrasadas — usadas para calcular valor atualizado por contrato. */
  const [overduePerContract, setOverduePerContract] = useState<
    Record<string, { totalUpdated: number; count: number; maxDays: number }>
  >({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentContractId, setPaymentContractId] = useState<string | null>(null)

  useEffect(() => {
    setTitle('Extrato Financeiro')
    setBreadcrumb([{ label: 'Home', href: '/home' }, { label: 'Extrato Financeiro' }])
    return () => {
      setTitle('')
      setBreadcrumb([])
    }
  }, [setTitle, setBreadcrumb])

  const fetchData = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const [extratoData, contractsData, movementsData, overdueRows] = await Promise.all([
        getExtratoFinanceiroData(companyId),
        // Pega ACTIVE, DRAFT e RENEGOTIATED: ambos visiveis no extrato. Contratos
        // RENEGOTIATED ficam como historico apos o acordo gerar um contrato novo.
        getContractsFiltered({
          companyId,
          statusId: null,
          customerName: searchTerm || null,
          limit: 50,
        }),
        getRecentMovements(companyId, 20),
        getOverdueInstallments(companyId),
      ])
      setExtrato(extratoData)
      setContracts(contractsData)
      setMovements(movementsData)

      // Agrupa parcelas em atraso por contrato e calcula valor atualizado
      // (saldo + multa 10% + juros 2% am pro-rata-dia, Clausula 4 do contrato).
      const map: Record<string, { totalUpdated: number; count: number; maxDays: number }> = {}
      for (const row of overdueRows) {
        const v = calculateOverdueValue(row)
        if (!v.isOverdue) continue
        const cur = map[row.contract_id] ?? { totalUpdated: 0, count: 0, maxDays: 0 }
        cur.totalUpdated += v.totalUpdated
        cur.count += 1
        cur.maxDays = Math.max(cur.maxDays, v.daysOverdue)
        map[row.contract_id] = cur
      }
      setOverduePerContract(map)
    } catch (e) {
      console.error('[ExtratoFinanceiro] Erro ao carregar dados:', e)
      setError(e instanceof Error ? e.message : 'Erro ao carregar extrato financeiro. Verifique sua conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [companyId, searchTerm])

  useEffect(() => {
    if (!companyId) return
    fetchData()
  }, [companyId, fetchData])

  function handleSearch() {
    setSearchTerm(searchInput.trim())
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }

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

  const contractsList = useMemo(
    () =>
      (contracts?.data ?? []).filter(
        (c) =>
          c.status_id === CONTRACT_STATUS.ACTIVE ||
          c.status_id === CONTRACT_STATUS.DRAFT ||
          c.status_id === CONTRACT_STATUS.RENEGOTIATED
      ),
    [contracts]
  )
  const totalContractAmount = contractsList.reduce(
    (sum, c) => sum + Number(c.total_amount ?? 0), 0
  )
  const totalInstallmentAmount = contractsList.reduce(
    (sum, c) => sum + Number(c.installment_amount ?? 0), 0
  )
  const totalOverdueUpdated = contractsList.reduce(
    (sum, c) => sum + (overduePerContract[c.id]?.totalUpdated ?? 0),
    0
  )

  const visibleMovements = movements.slice(0, 5)

  return (
    <div className="p-6 space-y-6">
      {error && (
        <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E3A8A] border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Card de Balanço com Gradiente */}
          <div className="rounded-[8px] bg-gradient-to-r from-emerald-500 to-purple-600 p-6 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Saldo Total Disponível</p>
                <p className="mt-2 text-3xl font-bold sm:text-4xl">
                  {formatCurrency(extrato?.totalAvailable ?? 0)}
                </p>
                <div className="mt-4">
                  <p className="text-sm font-medium opacity-90">A Receber Este Mês</p>
                  <p className="mt-1 text-xl font-semibold sm:text-2xl">
                    {formatCurrency(extrato?.toReceiveThisMonth ?? 0)}
                  </p>
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <MdAccountBalanceWallet className="h-7 w-7 text-white" />
              </div>
            </div>
          </div>

          {/* Resumo Mensal */}
          <h2 className="text-lg font-semibold text-[#0f1419]">Resumo Mensal</h2>

          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Receitas Previstas */}
            <div className={card + ' border-l-4 !border-l-emerald-500 p-4'}>
              <div className="flex items-start justify-between">
                <MdTrendingUp className="h-6 w-6 text-emerald-500" />
                {extrato?.expectedRevenueChange != null && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    {extrato.expectedRevenueChange > 0 ? '+' : ''}
                    {extrato.expectedRevenueChange.toFixed(0)}%
                  </span>
                )}
              </div>
              <p className="mt-2 text-2xl font-bold text-[#0f1419]">
                {formatCurrency(extrato?.expectedRevenue ?? 0)}
              </p>
              <p className="mt-1 text-sm text-[#536471]">Receitas Previstas</p>
            </div>

            {/* Parcelas Pendentes */}
            <div className={card + ' border-l-4 !border-l-purple-500 p-4'}>
              <div className="flex items-start justify-between">
                <MdAccessTime className="h-6 w-6 text-purple-500" />
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                  {extrato?.pendingInstallments.count ?? 0}
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-[#0f1419]">
                {formatCurrency(extrato?.pendingInstallments.total ?? 0)}
              </p>
              <p className="mt-1 text-sm text-[#536471]">Parcelas Pendentes</p>
            </div>

            {/* Contratos Ativos */}
            <div className={card + ' border-l-4 !border-l-orange-500 p-4'}>
              <div className="flex items-start justify-between">
                <MdDescription className="h-6 w-6 text-orange-500" />
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                  {extrato?.activeContracts.count ?? 0}
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-[#0f1419]">
                {formatCurrency(extrato?.activeContracts.total ?? 0)}
              </p>
              <p className="mt-1 text-sm text-[#536471]">Contratos Ativos</p>
            </div>
          </div>

          {/* Barra de Pesquisa */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Pesquisar pelo Nome"
              className={input + ' flex-1'}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <button type="button" onClick={handleSearch} className={buttonPrimary}>
              <MdSearch className="h-5 w-5" />
              Buscar
            </button>
          </div>

          {/* Tabela de Contratos */}
          <div className={card + ' overflow-hidden'}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={tableHead}>Cliente</th>
                    <th className={tableHead}>Valor</th>
                    <th className={tableHead}>Número Parcelas</th>
                    <th className={tableHead}>Valor Parcelas</th>
                    <th
                      className={tableHead}
                      title="Saldo + multa 10% + juros 2% a.m. das parcelas em atraso (Cláusula 4 do contrato)"
                    >
                      Em atraso (atualizado)
                    </th>
                    <th className={tableHead}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {contractsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={tableCell + ' text-center text-[#536471]'}>
                        Nenhum contrato encontrado.
                      </td>
                    </tr>
                  ) : (
                    contractsList.map((contract) => {
                      const isDraft = contract.status_id === CONTRACT_STATUS.DRAFT
                      const isRenegotiated =
                        contract.status_id === CONTRACT_STATUS.RENEGOTIATED
                      const isAgreement = !!contract.agreement_type
                      const overdue = overduePerContract[contract.id]
                      return (
                        <tr key={contract.id} className="border-t border-[#e5e7eb]">
                          <td className={tableCell + ' font-medium'}>
                            <div className="flex flex-wrap items-center gap-2">
                              {getCustomerName(contract)}
                              {isDraft && (
                                <span
                                  className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700"
                                  title="Contrato em rascunho: parcelas ainda não foram geradas"
                                >
                                  Rascunho
                                </span>
                              )}
                              {isRenegotiated && (
                                <span
                                  className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-semibold text-zinc-700"
                                  title="Contrato renegociado — parcelas migradas para um novo contrato"
                                >
                                  Renegociado
                                </span>
                              )}
                              {isAgreement && (
                                <span
                                  className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700"
                                  title={
                                    contract.agreement_type === 'juridico'
                                      ? `Acordo jurídico${contract.process_number ? ` — Processo ${contract.process_number}` : ''}`
                                      : 'Acordo amigável'
                                  }
                                >
                                  Acordo {contract.agreement_type === 'juridico' ? 'jurídico' : 'amigável'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={tableCell}>
                            {formatCurrency(Number(contract.total_amount ?? 0))}
                          </td>
                          <td className={tableCell}>
                            {contract.installments_count ?? '—'}
                          </td>
                          <td className={tableCell}>
                            {contract.installment_amount
                              ? `${formatCurrency(Number(contract.installment_amount))} - ${formatDate(contract.first_due_date)}`
                              : '—'}
                          </td>
                          <td className={tableCell}>
                            {overdue ? (
                              <div>
                                <span className="font-semibold text-red-600">
                                  {formatCurrency(overdue.totalUpdated)}
                                </span>
                                <span className="ml-2 text-xs text-[#536471]">
                                  ({overdue.count} parcela{overdue.count > 1 ? 's' : ''} · {overdue.maxDays}d)
                                </span>
                              </div>
                            ) : (
                              <span className="text-[#536471]">—</span>
                            )}
                          </td>
                          <td className={tableCell}>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => router.push(`/detalhes-contrato/${contract.id}`)}
                                className="rounded-[8px] p-1.5 text-[#536471] transition hover:bg-[#f8fafc] hover:text-[#1E3A8A]"
                                title="Ver detalhes do contrato"
                              >
                                <MdVisibility className="h-5 w-5" />
                              </button>
                              {!isDraft && !isRenegotiated && (
                                <button
                                  type="button"
                                  onClick={() => setPaymentContractId(contract.id)}
                                  className="inline-flex items-center gap-1 rounded-[8px] border border-[#1E3A8A] bg-white px-2 py-1 text-xs font-medium text-[#1E3A8A] transition-colors hover:bg-[#1E3A8A] hover:text-white"
                                  title="Registrar pagamento de parcela"
                                >
                                  <MdPayment className="h-3.5 w-3.5" />
                                  Pagar parcela
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
                {contractsList.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-[#e5e7eb] bg-[#f8fafc]">
                      <td className={tableCell + ' font-semibold'}>Total</td>
                      <td className={tableCell + ' font-semibold'}>
                        {formatCurrency(totalContractAmount)}
                      </td>
                      <td className={tableCellMuted} />
                      <td className={tableCell + ' font-semibold'}>
                        {formatCurrency(totalInstallmentAmount)}
                      </td>
                      <td className={tableCell + ' font-semibold text-red-600'}>
                        {totalOverdueUpdated > 0 ? formatCurrency(totalOverdueUpdated) : '—'}
                      </td>
                      <td className={tableCellMuted} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Movimentações Recentes */}
          <div className={card + ' p-6'}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#0f1419]">Movimentações Recentes</h2>
              <button
                type="button"
                onClick={() => router.push('/extrato-financeiro/movimentacoes')}
                className="text-sm font-medium text-[#1E3A8A] hover:underline"
              >
                Ver todas
              </button>
            </div>

            {movements.length === 0 ? (
              <p className="py-4 text-center text-sm text-[#536471]">
                Nenhuma movimentação recente.
              </p>
            ) : (
              <div className="divide-y divide-[#e5e7eb]">
                {visibleMovements.map((mov) => {
                  const config = MOVEMENT_CONFIG[mov.type]
                  const IconComponent = config.Icon
                  const canPay = mov.type === 'installment' && !!mov.contractId
                  return (
                    <div key={mov.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                      {/* Ícone */}
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.iconClass}`}>
                        <IconComponent className="h-5 w-5" />
                      </div>

                      {/* Conteúdo */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#0f1419]">{mov.title}</p>
                        {mov.subtitle.split('\n').map((line, i) => (
                          <p key={i} className="text-xs text-[#536471]">{line}</p>
                        ))}
                        <p className="mt-0.5 text-xs text-[#536471]">
                          {formatRelativeDate(mov.date)}
                        </p>
                      </div>

                      {/* Valor + ação */}
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <p className={`text-sm font-semibold ${config.amountClass}`}>
                          {config.prefix}{formatCurrency(mov.amount)}
                        </p>
                        {canPay && (
                          <button
                            type="button"
                            onClick={() => setPaymentContractId(mov.contractId!)}
                            className="inline-flex items-center gap-1 rounded-[8px] border border-[#1E3A8A] bg-white px-2 py-1 text-xs font-medium text-[#1E3A8A] transition-colors hover:bg-[#1E3A8A] hover:text-white"
                            title="Registrar pagamento desta parcela"
                          >
                            <MdPayment className="h-3.5 w-3.5" />
                            Registrar pagamento
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      <PopupQuitacao
        open={!!paymentContractId}
        onClose={() => setPaymentContractId(null)}
        contractId={paymentContractId}
        companyId={companyId}
        onSuccess={() => {
          setPaymentContractId(null)
          fetchData()
        }}
      />
    </div>
  )
}
