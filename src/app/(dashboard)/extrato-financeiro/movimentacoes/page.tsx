'use client'

import { LoadingScreen, TablePagination } from '@/components/ui'
import { useHeader } from '@/contexts/header-context'
import { getRecentMovementsPaginated } from '@/lib/supabase/reports'
import type { RecentMovement, MovementType } from '@/lib/supabase/reports'
import { useCompanyId } from '@/hooks/use-company-id'
import { card, input, label as labelClass, buttonSecondary } from '@/lib/design'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MdAccessTime,
  MdArrowDownward,
  MdArrowUpward,
  MdSearch,
  MdFilterList,
} from 'react-icons/md'

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

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

export default function MovimentacoesPage() {
  const { setTitle, setBreadcrumb } = useHeader()
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()

  const [movements, setMovements] = useState<RecentMovement[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Filtros
  const [filterType, setFilterType] = useState<MovementType | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce de busca (400ms)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchInput])

  // Reset page quando filtros mudam
  useEffect(() => {
    setPage(1)
  }, [pageSize, filterType, startDate, endDate, debouncedSearch])

  useEffect(() => {
    setTitle('Movimentações')
    setBreadcrumb([
      { label: 'Home', href: '/home' },
      { label: 'Extrato Financeiro', href: '/extrato-financeiro' },
      { label: 'Movimentações' },
    ])
    return () => {
      setTitle('')
      setBreadcrumb([])
    }
  }, [setTitle, setBreadcrumb])

  useEffect(() => {
    setTitle('Movimentações')
    setBreadcrumb([
      { label: 'Home', href: '/home' },
      { label: 'Extrato Financeiro', href: '/extrato-financeiro' },
      { label: 'Movimentações' },
    ])
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
      const result = await getRecentMovementsPaginated(companyId, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        type: filterType || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: debouncedSearch || undefined,
      })
      setMovements(result.data)
      setTotal(result.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar movimentações.')
    } finally {
      setLoading(false)
    }
  }, [companyId, page, pageSize, filterType, startDate, endDate, debouncedSearch])

  useEffect(() => {
    if (!companyId) return
    fetchData()
  }, [companyId, fetchData])

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

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const hasActiveFilters = filterType !== '' || startDate !== '' || endDate !== '' || searchInput.trim() !== ''

  function clearFilters() {
    setFilterType('')
    setStartDate('')
    setEndDate('')
    setSearchInput('')
    setDebouncedSearch('')
  }

  return (
    <div className="p-6 space-y-6">
      {error && (
        <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Barra de filtros */}
      <div className={card + ' p-4'}>
        <div className="flex flex-wrap items-end gap-4">
          {/* Busca */}
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="filter-search" className={labelClass}>
              <MdSearch className="inline h-4 w-4 mr-1 text-[#57636C]" />
              Buscar cliente/fornecedor
            </label>
            <input
              type="text"
              id="filter-search"
              placeholder="Nome do cliente ou fornecedor"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={input}
            />
          </div>

          {/* Tipo */}
          <div className="w-[200px]">
            <label htmlFor="filter-type" className={labelClass}>
              Tipo de movimentação
            </label>
            <select
              id="filter-type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as MovementType | '')}
              className={input}
            >
              <option value="">Todos</option>
              <option value="payment">Pagamento</option>
              <option value="expense">Despesa</option>
              <option value="installment">Parcela a receber</option>
              <option value="new_contract">Novo contrato</option>
            </select>
          </div>

          {/* Data início */}
          <div className="w-[140px]">
            <label htmlFor="filter-start" className={labelClass}>
              De
            </label>
            <input
              type="date"
              id="filter-start"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={input}
            />
          </div>

          {/* Data fim */}
          <div className="w-[140px]">
            <label htmlFor="filter-end" className={labelClass}>
              Até
            </label>
            <input
              type="date"
              id="filter-end"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={input}
            />
          </div>

          {/* Limpar filtros */}
          {hasActiveFilters && (
            <div>
              <button
                type="button"
                onClick={clearFilters}
                className={buttonSecondary}
              >
                <MdFilterList className="mr-1.5 h-4 w-4" />
                Limpar
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E3A8A] border-t-transparent" />
        </div>
      ) : movements.length === 0 ? (
        <div className={card + ' p-8 text-center'}>
          <p className="text-sm text-[#536471]">Nenhuma movimentação encontrada.</p>
        </div>
      ) : (
        <>
          <div className={card + ' p-6'}>
            <div className="divide-y divide-[#e5e7eb]">
              {movements.map((mov) => {
                const config = MOVEMENT_CONFIG[mov.type]
                const IconComponent = config.Icon
                return (
                  <div key={mov.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.iconClass}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#0f1419]">{mov.title}</p>
                      {mov.subtitle.split('\n').map((line, i) => (
                        <p key={i} className="text-xs text-[#536471]">{line}</p>
                      ))}
                      <p className="mt-0.5 text-xs text-[#536471]">
                        {formatRelativeDate(mov.date)}
                      </p>
                    </div>

                    <p className={`shrink-0 text-sm font-semibold ${config.amountClass}`}>
                      {config.prefix}{formatCurrency(mov.amount)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          <TablePagination
            from={from}
            to={to}
            total={total}
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={setPageSize}
            onPrevious={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            selectId="movimentacoes-page-size"
          />
        </>
      )}
    </div>
  )
}
