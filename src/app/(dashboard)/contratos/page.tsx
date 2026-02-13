'use client'

import { Button, LoadingScreen, TablePagination } from '@/components/ui'
import { PopupGerarPdf } from '@/components/popup-gerar-pdf'
import { PopupQuitacao } from '@/components/popup-quitacao'
import { useHeader } from '@/contexts/header-context'
import { getContractsFiltered, type GetContractsParams } from '@/lib/supabase/contracts'
import { getCustomersAutocomplete } from '@/lib/supabase/customers'
import { useCompanyId } from '@/hooks/use-company-id'
import { CONTRACT_STATUS } from '@/types/enums'
import { formatCPFOrCNPJ } from '@/lib/format'
import { input, label as labelClass, pageSubtitle, tableHead, tableCell, tableCellMuted } from '@/lib/design'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ContractWithRelations } from '@/types/database'
import { MdDescription, MdEdit, MdReceipt, MdSearch, MdVisibility } from 'react-icons/md'

const PAGE_SIZE = 20

function formatCurrency(value: number | null) {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

/** Dia do vencimento: "Dia 10" a partir de first_due_date (yyyy-mm-dd) */
function formatVencimento(value: string | null) {
  if (!value || value.length < 10) return '—'
  const day = value.slice(8, 10)
  const d = parseInt(day, 10)
  return Number.isFinite(d) ? `Dia ${d}` : '—'
}

const STATUS_LABELS: Record<number, string> = {
  [CONTRACT_STATUS.DRAFT]: 'Rascunho',
  [CONTRACT_STATUS.ACTIVE]: 'Ativo',
  [CONTRACT_STATUS.CLOSED]: 'Encerrado',
  [CONTRACT_STATUS.CANCELED]: 'Cancelado',
}

const STATUS_BADGE_CLASS: Record<number, string> = {
  [CONTRACT_STATUS.DRAFT]: 'bg-[#E0E3E7] text-[#14181B]',
  [CONTRACT_STATUS.ACTIVE]: 'bg-[#249689]/15 text-[#249689]',
  [CONTRACT_STATUS.CLOSED]: 'bg-[#14181B] text-white',
  [CONTRACT_STATUS.CANCELED]: 'bg-red-100 text-red-700',
}

/** Nome do cliente para exibição: PF usa full_name; PJ usa trade_name ou legal_name. Ignora string vazia; se tudo vazio, mostra CPF/CNPJ. */
function getCustomerDisplayName(customer: ContractWithRelations['customer']): string {
  if (!customer) return '—'
  const name = [customer.full_name, customer.trade_name, customer.legal_name].find((s) => s != null && String(s).trim() !== '')
  if (name?.trim()) return String(name).trim()
  const doc = formatCPFOrCNPJ(customer.cpf ?? null, customer.cnpj ?? null)
  return doc !== '—' ? doc : '—'
}

export default function ContratosPage() {
  const { setTitle, setBreadcrumb } = useHeader()
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()
  const [response, setResponse] = useState<{
    total: number
    limit: number
    offset: number
    data: ContractWithRelations[]
  }>({ total: 0, limit: PAGE_SIZE, offset: 0, data: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [quitacaoOpen, setQuitacaoOpen] = useState(false)
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null)

  // Filters
  const [contractNumber, setContractNumber] = useState('')
  const [statusId, setStatusId] = useState<number | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerOptions, setCustomerOptions] = useState<{ id: string; label: string }[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; label: string } | null>(null)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const customerDropdownRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(1)

  const fetchContracts = useCallback(
    async (pageOverride?: number) => {
      if (!companyId) return
      const p = pageOverride ?? page
      setLoading(true)
      setError(null)
      try {
        const params: GetContractsParams = {
          companyId,
          limit: PAGE_SIZE,
          offset: (p - 1) * PAGE_SIZE,
          contractNumber: contractNumber.trim() || null,
          statusId: statusId ?? null,
          startDate: startDate || null,
          endDate: endDate || null,
          customerId: selectedCustomer?.id ?? null,
        }
        const res = await getContractsFiltered(params)
        setResponse(res)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar contratos.')
      } finally {
        setLoading(false)
      }
    },
    [companyId, page, contractNumber, statusId, startDate, endDate, selectedCustomer?.id]
  )

  useEffect(() => {
    if (!companyId) return
    fetchContracts()
  }, [companyId, fetchContracts])

  useEffect(() => {
    setTitle('Contratos')
    setBreadcrumb([{ label: 'Home', href: '/home' }, { label: 'Contratos' }])
    return () => {
      setTitle('')
      setBreadcrumb([])
    }
  }, [setTitle, setBreadcrumb])

  const fetchCustomerOptions = useCallback(async () => {
    if (!companyId) return
    try {
      const list = await getCustomersAutocomplete({
        companyId,
        search: customerSearch,
      })
      setCustomerOptions(list)
    } catch {
      setCustomerOptions([])
    }
  }, [companyId, customerSearch])

  useEffect(() => {
    if (!companyId) return
    const t = setTimeout(fetchCustomerOptions, 300)
    return () => clearTimeout(t)
  }, [companyId, customerSearch, fetchCustomerOptions])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleApplyFilters = () => {
    setPage(1)
    fetchContracts(1)
  }

  const handleClearFilters = () => {
    setContractNumber('')
    setStatusId(null)
    setStartDate('')
    setEndDate('')
    setSelectedCustomer(null)
    setCustomerSearch('')
    setPage(1)
  }

  if (companyLoading) return <LoadingScreen message="Carregando..." />
  if (companyError || !companyId) {
    return (
      <div className="p-6">
        <p className="text-amber-600">
          Configure sua empresa (company_users) para listar contratos.
        </p>
      </div>
    )
  }

  const { data: contracts, total } = response
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6">
      <div className="mb-6 flex shrink-0 flex-wrap items-start justify-between gap-4">
        <p className={pageSubtitle}>
          Gerencie todos os contratos cadastrados no sistema
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {!loading && (
            <p className="text-sm text-[#57636C]">
              {total} contrato(s) encontrado(s)
            </p>
          )}
          <Link href="/novo-contrato">
            <Button type="button" variant="primary">
              Novo Contrato
            </Button>
          </Link>
        </div>
      </div>

        {/* Filtros — mesmo estilo da página de Clientes */}
        <div className="mb-6 flex shrink-0 flex-wrap items-end gap-4">
          <div ref={customerDropdownRef} className="relative min-w-0 flex-1">
            <label className={labelClass}>Nome/Razão Social</label>
            <div className="relative">
              <input
                type="text"
                value={selectedCustomer ? selectedCustomer.label : customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value)
                  setSelectedCustomer(null)
                  setShowCustomerDropdown(true)
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Buscar por nome..."
                className={input + ' pr-10'}
              />
              <MdSearch className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#57636C]" aria-hidden />
            </div>
            {showCustomerDropdown && (customerSearch || !selectedCustomer) && (
              <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-[8px] border border-[#E0E3E7] bg-white py-1 shadow-lg" role="listbox">
                <li>
                  <button
                    type="button"
                    className="w-full px-4 py-2 text-left text-sm text-[#57636C] hover:bg-[#f1f4f8]"
                    onClick={() => {
                      setSelectedCustomer(null)
                      setCustomerSearch('')
                      setShowCustomerDropdown(false)
                    }}
                  >
                    Todos
                  </button>
                </li>
                {customerOptions.map((opt) => (
                  <li key={opt.id}>
                    <button
                      type="button"
                      role="option"
                      className="w-full px-4 py-2 text-left text-sm text-[#0f1419] hover:bg-[#f1f4f8]"
                      onClick={() => {
                        setSelectedCustomer(opt)
                        setCustomerSearch('')
                        setShowCustomerDropdown(false)
                      }}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="w-[140px] min-w-0 sm:w-[159px]">
            <label className={labelClass}>Status</label>
            <select
              value={statusId ?? ''}
              onChange={(e) => setStatusId(e.target.value ? Number(e.target.value) : null)}
              className={input + ' cursor-pointer appearance-none pr-8'}
            >
              <option value="">Todos</option>
              {Object.entries(STATUS_LABELS).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 flex-1 sm:max-w-[140px]">
            <label className={labelClass}>Número</label>
            <input
              type="text"
              value={contractNumber}
              onChange={(e) => setContractNumber(e.target.value)}
              placeholder="N° contrato"
              className={input}
            />
          </div>
          <div>
            <label className={labelClass}>Por data (inclusão)</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={input + ' min-w-[130px]'}
              />
              <span className="text-sm text-[#57636C]">até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={input + ' min-w-[130px]'}
              />
            </div>
          </div>
          <Button type="button" variant="primary" onClick={handleApplyFilters}>
            Filtrar
          </Button>
          <Button type="button" variant="secondary" onClick={handleClearFilters}>
            Limpar Filtros
          </Button>
        </div>

      {error && (
        <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingScreen message="Carregando contratos..." />
      ) : (
        <>
          {/* Mobile: cards em lista */}
          <div className="min-h-0 flex-1 overflow-y-auto md:hidden">
            <div className="space-y-3">
              {contracts.length === 0 ? (
                <div className="rounded-[8px] border border-[#E0E3E7] bg-white px-4 py-8 text-center text-sm text-[#57636C] shadow-sm">
                  Nenhum contrato encontrado.
                </div>
              ) : (
                contracts.map((c) => {
                  const statusId = c.status?.id ?? 0
                  const statusLabel = c.status ? (STATUS_LABELS[statusId] ?? c.status.name) : '—'
                  const statusClass = STATUS_BADGE_CLASS[statusId] ?? 'bg-[#E0E3E7] text-[#14181B]'
                  return (
                    <div
                      key={c.id}
                      className="rounded-[8px] border border-[#E0E3E7] bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[#14181B]">
                            {c.contract_number ?? c.id.slice(0, 8)}
                          </p>
                          <p className="mt-0.5 text-sm text-[#57636C]">
                            {getCustomerDisplayName(c.customer)}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-medium text-[#1E3A8A]">
                              {formatCurrency(c.contract_amount)}
                            </span>
                            <span className="text-[#57636C]">
                              {c.installments_count}x {formatCurrency(c.installment_amount)}
                            </span>
                            <span className="text-[#57636C]">
                              · {formatVencimento(c.first_due_date)}
                            </span>
                          </div>
                          <span
                            className={
                              'mt-2 inline-flex rounded-[8px] px-2.5 py-0.5 text-xs font-medium ' +
                              statusClass
                            }
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Link
                            href={`/detalhes-contrato/${c.id}`}
                            className="rounded p-1.5 text-[#1E3A8A] hover:bg-[#1E3A8A]/10"
                            title="Ver detalhes"
                            aria-label="Ver detalhes do contrato"
                          >
                            <MdVisibility className="h-5 w-5" />
                          </Link>
                          <Link
                            href={`/editar-contrato/${c.id}`}
                            className="rounded p-1.5 text-[#1E3A8A] hover:bg-[#1E3A8A]/10"
                            title="Editar"
                            aria-label="Editar contrato"
                          >
                            <MdEdit className="h-5 w-5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => { setSelectedContractId(c.id); setPdfOpen(true) }}
                            className="rounded p-1.5 text-[#1E3A8A] hover:bg-[#1E3A8A]/10"
                            title="Gerar PDF"
                            aria-label="Gerar PDF do contrato"
                          >
                            <MdDescription className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setSelectedContractId(c.id); setQuitacaoOpen(true) }}
                            className="rounded p-1.5 text-[#1E3A8A] hover:bg-[#1E3A8A]/10"
                            title="Quitação"
                            aria-label="Quitação e pagamentos"
                          >
                            <MdReceipt className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Desktop: tabela — scroll horizontal quando necessário para manter botões visíveis */}
          <div className="hidden min-h-0 flex-1 overflow-x-auto overflow-y-auto md:block">
            <div className="min-w-[800px] overflow-hidden rounded-[8px] border border-[#E0E3E7] bg-white shadow-sm">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#E0E3E7] bg-[#f1f4f8]">
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#57636C] rounded-tl-[8px]">
                      N° Contrato
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#57636C]">
                      Cliente
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#57636C]">
                      CPF/CNPJ
                    </th>
                    <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-[#57636C]">
                      Valor Empréstimo
                    </th>
                    <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-[#57636C]">
                      Parcelas
                    </th>
                    <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-[#57636C]">
                      Valor Parcela
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#57636C]">
                      Vencimento
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#57636C]">
                      Status
                    </th>
                    <th className="bg-[#f1f4f8] px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-[#57636C] rounded-tr-[8px]">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm text-[#57636C]">
                        Nenhum contrato encontrado.
                      </td>
                    </tr>
                  ) : (
                    contracts.map((c, index) => {
                      const statusId = c.status?.id ?? 0
                      const statusLabel = c.status ? (STATUS_LABELS[statusId] ?? c.status.name) : '—'
                      const statusClass = STATUS_BADGE_CLASS[statusId] ?? 'bg-[#E0E3E7] text-[#14181B]'
                      const isEven = index % 2 === 0
                      return (
                        <tr
                          key={c.id}
                          className={
                            'border-b border-[#E0E3E7] transition-colors ' +
                            (isEven ? 'bg-white' : 'bg-[#f8f9fb]') +
                            ' hover:bg-[#eef1f5]'
                          }
                        >
                          <td className="px-4 py-3.5 text-sm font-medium text-[#14181B]">
                            {c.contract_number ?? c.id.slice(0, 8)}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-[#14181B]">
                            {getCustomerDisplayName(c.customer)}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-[#57636C] tabular-nums">
                            {formatCPFOrCNPJ(c.customer?.cpf ?? null, c.customer?.cnpj ?? null)}
                          </td>
                          <td className="px-4 py-3.5 text-right text-sm font-medium text-[#1E3A8A] tabular-nums">
                            {formatCurrency(c.contract_amount)}
                          </td>
                          <td className="px-4 py-3.5 text-right text-sm text-[#14181B] tabular-nums">
                            {c.installments_count}x
                          </td>
                          <td className="px-4 py-3.5 text-right text-sm text-[#14181B] tabular-nums">
                            {formatCurrency(c.installment_amount)}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-[#57636C]">
                            {formatVencimento(c.first_due_date)}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={
                                'inline-flex rounded-[8px] px-2.5 py-1 text-xs font-medium ' + statusClass
                              }
                            >
                              {statusLabel}
                            </span>
                          </td>
                          <td className="bg-inherit px-4 py-3.5 text-right">
                            <span className="inline-flex items-center justify-end gap-0.5">
                              <span className="relative group">
                                <Link
                                  href={`/detalhes-contrato/${c.id}`}
                                  className="inline-flex rounded-[8px] p-2 text-[#1E3A8A] transition-colors hover:bg-[#1E3A8A]/10"
                                  title="Ver detalhes"
                                  aria-label="Ver detalhes do contrato"
                                >
                                  <MdVisibility className="h-5 w-5" />
                                </Link>
                                <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-[8px] border border-[#E0E3E7] bg-white px-2.5 py-1.5 text-xs text-[#57636C] opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100">
                                  Ver detalhes
                                </span>
                              </span>
                              <span className="relative group">
                                <Link
                                  href={`/editar-contrato/${c.id}`}
                                  className="inline-flex rounded-[8px] p-2 text-[#1E3A8A] transition-colors hover:bg-[#1E3A8A]/10"
                                  title="Editar contrato"
                                  aria-label="Editar contrato"
                                >
                                  <MdEdit className="h-5 w-5" />
                                </Link>
                                <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-[8px] border border-[#E0E3E7] bg-white px-2.5 py-1.5 text-xs text-[#57636C] opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100">
                                  Editar contrato
                                </span>
                              </span>
                              <span className="relative group">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedContractId(c.id)
                                    setPdfOpen(true)
                                  }}
                                  className="rounded-[8px] p-2 text-[#1E3A8A] transition-colors hover:bg-[#1E3A8A]/10"
                                  title="Gerar PDF do contrato"
                                  aria-label="Gerar PDF do contrato"
                                >
                                  <MdDescription className="h-5 w-5" />
                                </button>
                                <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-[8px] border border-[#E0E3E7] bg-white px-2.5 py-1.5 text-xs text-[#57636C] opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100">
                                  Gerar PDF do contrato
                                </span>
                              </span>
                              <span className="relative group">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedContractId(c.id)
                                    setQuitacaoOpen(true)
                                  }}
                                  className="rounded-[8px] p-2 text-[#1E3A8A] transition-colors hover:bg-[#1E3A8A]/10"
                                  title="Quitação e pagamentos"
                                  aria-label="Quitação e pagamentos"
                                >
                                  <MdReceipt className="h-5 w-5" />
                                </button>
                                <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-[8px] border border-[#E0E3E7] bg-white px-2.5 py-1.5 text-xs text-[#57636C] opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100">
                                  Quitação e pagamentos
                                </span>
                              </span>
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <TablePagination
            from={from}
            to={to}
            total={total}
            page={page}
            totalPages={totalPages}
            onPrevious={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        </>
      )}

      <PopupGerarPdf
        open={pdfOpen}
        onClose={() => {
          setPdfOpen(false)
          setSelectedContractId(null)
        }}
        contractId={selectedContractId}
      />
      <PopupQuitacao
        open={quitacaoOpen}
        onClose={() => {
          setQuitacaoOpen(false)
          setSelectedContractId(null)
        }}
        contractId={selectedContractId}
        companyId={companyId}
        onSuccess={fetchContracts}
      />
    </div>
  )
}
