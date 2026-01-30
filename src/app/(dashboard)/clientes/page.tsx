'use client'

import { Button } from '@/components/ui'
import { LoadingScreen } from '@/components/ui'
import { PopupDetalhesCliente } from '@/components/popup-detalhes-cliente'
import { getCustomers } from '@/lib/supabase/customers'
import { formatCPFOrCNPJ } from '@/lib/format'
import { useCompanyId } from '@/hooks/use-company-id'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { Customer } from '@/types/database'

const list = (arr: unknown): Customer[] => (Array.isArray(arr) ? arr : [])

export default function ClientesPage() {
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchName, setSearchName] = useState('')
  const [searchCpf, setSearchCpf] = useState('')
  const [searchCnpj, setSearchCnpj] = useState('')
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const fetchCustomers = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getCustomers({
        companyId,
        limit: 50,
        offset: 0,
        name: searchName || undefined,
        cpf: searchCpf || undefined,
        cnpj: searchCnpj || undefined,
      })
      setCustomers(list(data))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar clientes.')
    } finally {
      setLoading(false)
    }
  }, [companyId, searchName, searchCpf, searchCnpj])

  useEffect(() => {
    if (!companyId) return
    fetchCustomers()
  }, [companyId, fetchCustomers])

  const clearFilters = useCallback(() => {
    setSearchName('')
    setSearchCpf('')
    setSearchCnpj('')
  }, [])

  if (companyLoading) return <LoadingScreen message="Carregando..." />
  if (companyError || !companyId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Clientes</h1>
        <p className="mt-2 text-amber-600">
          Configure sua empresa (company_users) para listar clientes.
        </p>
      </div>
    )
  }

  const customerList = list(customers)
  const count = customerList.length

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Lista de Clientes</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Gerencie todos os clientes cadastrados no sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/home">
            <Button type="button" variant="secondary">
              ← Voltar
            </Button>
          </Link>
          <Link href="/cadastrar-cliente">
            <Button type="button" variant="primary">
              + Novo Cliente
            </Button>
          </Link>
        </div>
      </div>

      <p className="mb-4 text-right text-sm text-zinc-500">
        [{count}] cliente(s) encontrado(s)
      </p>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-end gap-4 rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex-1 min-w-[180px]">
          <label className="mb-1 block text-xs font-medium text-zinc-500">Buscar por nome</label>
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Buscar por nome..."
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
          />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-zinc-500">CPF</label>
          <input
            type="text"
            value={searchCpf}
            onChange={(e) => setSearchCpf(e.target.value)}
            placeholder="000.000.000-00"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
          />
        </div>
        <div className="w-48">
          <label className="mb-1 block text-xs font-medium text-zinc-500">CNPJ</label>
          <input
            type="text"
            value={searchCnpj}
            onChange={(e) => setSearchCnpj(e.target.value)}
            placeholder="00.000.000/0000-00"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="primary" onClick={() => {}}>
            Relatórios
          </Button>
          <Button type="button" variant="secondary" onClick={clearFilters}>
            Limpar Filtros
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingScreen message="Carregando clientes..." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">CPF/CNPJ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Nome/Razão Social</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Contato</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Cidade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {customerList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                      Nenhum cliente encontrado.
                    </td>
                  </tr>
                ) : (
                  customerList.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 text-sm text-zinc-900">
                        {c.customer_code ?? `N: ${c.id.slice(0, 8)}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-800">
                          {c.person_type === 'pj' ? 'PJ' : 'PF'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600">
                        {formatCPFOrCNPJ(c.cpf, c.cnpj)}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-900">
                        {c.legal_name ?? c.full_name ?? c.trade_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600">
                        {c.phone ?? c.mobile ?? c.email ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600">—</td>
                      <td className="px-4 py-3 text-sm text-zinc-600">—</td>
                      <td className="px-4 py-3 text-right">
                        <span className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => { setDetailCustomer(c); setDetailOpen(true) }}
                            className="rounded p-1.5 text-[#1E3A8A] hover:bg-[#1E3A8A]/10"
                            title="Ver"
                          >
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600"
                            title="Excluir"
                          >
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
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
