'use client'

import { Button } from '@/components/ui'
import { LoadingScreen } from '@/components/ui'
import { PopupDetalhesCliente } from '@/components/popup-detalhes-cliente'
import { useHeader } from '@/contexts/header-context'
import { deleteCustomer, getCustomers } from '@/lib/supabase/customers'
import { formatCPFOrCNPJ } from '@/lib/format'
import { useCompanyId } from '@/hooks/use-company-id'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MdAdd, MdArrowBack, MdEdit, MdEditDocument, MdPersonOff, MdSearch, MdVisibility } from 'react-icons/md'
import { buttonPrimary, buttonSecondary, input, label as labelClass, pageSubtitle, pageTitle, pillType, tableCell, tableCellMuted, tableHead } from '@/lib/design'
import type { CustomerFromAPI } from '@/types/database'

const list = (arr: unknown): CustomerFromAPI[] => (Array.isArray(arr) ? arr : [])

export default function ClientesPage() {
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()
  const [customers, setCustomers] = useState<CustomerFromAPI[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchName, setSearchName] = useState('')
  const [searchCpf, setSearchCpf] = useState('')
  const [searchCnpj, setSearchCnpj] = useState('')
  const [statusFilter, setStatusFilter] = useState<number>(0)
  const [detailCustomer, setDetailCustomer] = useState<CustomerFromAPI | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Debounced search: only fires the RPC after 400ms of inactivity
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedFilters, setDebouncedFilters] = useState({ name: '', cpf: '', cnpj: '', status: 0 })

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedFilters({
        name: searchName.trim(),
        cpf: searchCpf.replace(/\D/g, ''),
        cnpj: searchCnpj.replace(/\D/g, ''),
        status: statusFilter,
      })
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchName, searchCpf, searchCnpj, statusFilter])

  const fetchCustomers = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const res = await getCustomers({
        companyId,
        limit: 50,
        offset: 0,
        name: debouncedFilters.name || undefined,
        cpf: debouncedFilters.cpf || undefined,
        cnpj: debouncedFilters.cnpj || undefined,
        statusId: debouncedFilters.status === 0 ? null : debouncedFilters.status,
      })
      setCustomers(list(res.data))
      setTotal(res.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar clientes.')
    } finally {
      setLoading(false)
    }
  }, [companyId, debouncedFilters])

  useEffect(() => {
    if (!companyId) return
    fetchCustomers()
  }, [companyId, fetchCustomers])

  const clearFilters = useCallback(() => {
    setSearchName('')
    setSearchCpf('')
    setSearchCnpj('')
    setStatusFilter(0)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setDebouncedFilters({ name: '', cpf: '', cnpj: '', status: 0 })
  }, [])

  const handleDelete = useCallback(
    async (c: CustomerFromAPI) => {
      const name = c.full_name ?? c.legal_name ?? c.trade_name ?? 'este cliente'
      if (!companyId || !window.confirm(`Excluir ${name}? Esta ação marca o cliente como excluído (exclusão lógica).`)) return
      setDeletingId(c.id)
      setError(null)
      try {
        await deleteCustomer(c.id, companyId)
        await fetchCustomers()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao excluir cliente.')
      } finally {
        setDeletingId(null)
      }
    },
    [companyId, fetchCustomers]
  )

  const { setLeftContent } = useHeader()
  useEffect(() => {
    setLeftContent(
      <div className="flex items-center gap-4">
        <Link href="/cadastrar-cliente">
          <Button
            type="button"
            className="border border-white bg-[#1E3A8A] text-white hover:bg-[#1E3A8A]/90"
          >
            <MdAdd className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </Link>
        <Link href="/home">
          <Button
            type="button"
            className="border border-white bg-[#1E3A8A] text-white hover:bg-[#1E3A8A]/90"
          >
            <MdArrowBack className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </div>
    )
    return () => setLeftContent(null)
  }, [setLeftContent])

  if (companyLoading) return <LoadingScreen message="Carregando..." />
  if (companyError || !companyId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-[#14181B]">Clientes</h1>
        <p className="mt-2 text-amber-600">
          Sua conta não está vinculada a nenhuma empresa. Faça login com um usuário cadastrado em Cadastrar Acesso (com acesso a uma empresa).
        </p>
        {companyError && (
          <p className="mt-2 text-sm text-red-600">{companyError.message}</p>
        )}
      </div>
    )
  }

  const customerList = list(customers)
  const count = total

  return (
    <div className="flex-1 overflow-auto p-6">
        {/* Título + contador na mesma linha */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className={pageTitle}>Lista de Clientes</h1>
            <p className={pageSubtitle}>
              Gerencie todos os clientes cadastrados no sistema
            </p>
          </div>
          <p className="text-sm text-[#57636C]">
            {count} cliente(s) encontrado(s)
          </p>
        </div>

        {/* Filtros em linha (igual ao Flutter: Nome/Razão Social, CPF, CNPJ, Status, Relatórios, Limpar) */}
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <div className="min-w-0 flex-1">
            <label className={labelClass}>Nome/Razão Social</label>
            <div className="relative">
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Buscar por nome..."
                className={`${input} pr-10`}
              />
              <MdSearch className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#57636C]" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <label className={labelClass}>CPF</label>
            <input
              type="text"
              value={searchCpf}
              onChange={(e) => setSearchCpf(e.target.value)}
              placeholder="000.000.000-00"
              className={input}
            />
          </div>
          <div className="min-w-0 flex-1">
            <label className={labelClass}>CNPJ</label>
            <input
              type="text"
              value={searchCnpj}
              onChange={(e) => setSearchCnpj(e.target.value)}
              placeholder="00.000.000/0000-00"
              className={input}
            />
          </div>
          <div className="w-[159px]">
            <label className={labelClass}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(Number(e.target.value))}
              className={`${input} cursor-pointer appearance-none pr-8`}
            >
              <option value={0}>Todos</option>
              <option value={1}>Ativos</option>
              <option value={2}>Inativos</option>
            </select>
          </div>
          <button type="button" className={buttonPrimary} onClick={() => {}}>
            <MdEditDocument className="mr-2 h-5 w-5" />
            Relatórios
          </button>
          <button type="button" className={buttonSecondary} onClick={clearFilters}>
            Limpar Filtros
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingScreen message="Carregando clientes..." />
        ) : (
          <div className="overflow-hidden rounded-[8px] border border-[#E0E3E7] bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E0E3E7]">
                <thead>
                  <tr>
                    <th className={tableHead}>Código</th>
                    <th className={tableHead}>Tipo</th>
                    <th className={tableHead}>CPF/CNPJ</th>
                    <th className={tableHead}>Nome/Razão Social</th>
                    <th className={tableHead}>Contato</th>
                    <th className={tableHead}>Cidade</th>
                    <th className={tableHead}>Status</th>
                    <th className={`${tableHead} text-right`}>Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E0E3E7] bg-white">
                  {customerList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-[#57636C]">
                        Nenhum cliente encontrado.
                      </td>
                    </tr>
                  ) : (
                    customerList.map((c) => (
                      <tr key={c.id} className="hover:bg-[#f1f4f8]/50">
                        <td className={tableCell}>
                          {c.customer_code ?? `N: ${c.id.slice(0, 8)}`}
                        </td>
                        <td className="px-4 py-3">
                          <span className={pillType}>
                            {c.person_type === 'juridica' ? 'PJ' : 'PF'}
                          </span>
                        </td>
                        <td className={tableCellMuted}>
                          {formatCPFOrCNPJ(c.cpf, c.cnpj)}
                        </td>
                        <td className={tableCell}>
                          {c.person_type === 'juridica'
                            ? (c.legal_name ?? c.trade_name ?? '—')
                            : (c.full_name ?? '—')}
                        </td>
                        <td className={tableCellMuted}>
                          <div className="flex flex-col gap-0.5">
                            {(c.phone ?? c.mobile) && (
                              <span>{c.phone ?? c.mobile}</span>
                            )}
                            {c.email && (
                              <span>{c.email}</span>
                            )}
                            {!(c.phone ?? c.mobile) && !c.email && '—'}
                          </div>
                        </td>
                        <td className={tableCellMuted}>
                          {[c.address?.city, c.address?.state].filter(Boolean).join('/') || '—'}
                        </td>
                        <td className={tableCellMuted}>
                          {c.status?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => { setDetailCustomer(c); setDetailOpen(true) }}
                              className="rounded p-1.5 text-[#1E3A8A] hover:bg-[#1E3A8A]/10"
                              title="Ver detalhes"
                            >
                              <MdVisibility className="h-5 w-5" />
                            </button>
                            <Link
                              href={`/editar-cliente/${c.id}`}
                              className="rounded p-1.5 text-[#1E3A8A] hover:bg-[#1E3A8A]/10"
                              title="Editar"
                            >
                              <MdEdit className="h-5 w-5" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(c)}
                              disabled={deletingId === c.id}
                              className="rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              title="Excluir"
                            >
                              <MdPersonOff className="h-5 w-5" />
                            </button>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      <PopupDetalhesCliente
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailCustomer(null) }}
        customer={detailCustomer}
      />
    </div>
  )
}
