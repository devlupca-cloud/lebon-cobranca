'use client'

import { ConfirmModal, LoadingScreen } from '@/components/ui'
import { useHeader } from '@/contexts/header-context'
import { useCompanyId } from '@/hooks/use-company-id'
import { getExpenses, deleteExpense } from '@/lib/supabase/expenses'
import type { CompanyExpense } from '@/types/database'
import { buttonPrimary, buttonSecondary, input, label as labelClass, tableCell, tableCellMuted, tableHead } from '@/lib/design'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { MdAdd, MdDelete, MdEdit, MdPlayArrow, MdVisibility } from 'react-icons/md'

const EXPENSE_TYPES = ['Aluguel', 'Energia', 'Água', 'Internet', 'Outros'] as const

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(iso: string) {
  if (!iso || iso.length < 10) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export default function ContasAPagarPage() {
  const { setTitle, setBreadcrumb } = useHeader()
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()
  const [expenses, setExpenses] = useState<CompanyExpense[]>([])

  useEffect(() => {
    setTitle('Contas a pagar')
    setBreadcrumb([{ label: 'Home', href: '/home' }, { label: 'Contas a pagar' }])
    return () => {
      setTitle('')
      setBreadcrumb([])
    }
  }, [setTitle, setBreadcrumb])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('')
  const [filterDate, setFilterDate] = useState<string>('')
  const [expenseToDelete, setExpenseToDelete] = useState<CompanyExpense | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const list = await getExpenses({
        companyId,
        expenseType: filterType || undefined,
        startDate: filterDate ? `${filterDate}-01` : undefined,
        endDate: filterDate ? (() => {
          const [y, m] = filterDate.split('-').map(Number)
          const lastDay = new Date(y, m, 0).getDate()
          return `${filterDate}-${String(lastDay).padStart(2, '0')}`
        })() : undefined,
      })
      setExpenses(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar contas.')
    } finally {
      setLoading(false)
    }
  }, [companyId, filterType, filterDate])

  useEffect(() => {
    if (!companyId) return
    fetchData()
  }, [companyId, fetchData])

  const handleDeleteClick = useCallback((row: CompanyExpense) => {
    setExpenseToDelete(row)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!expenseToDelete || !companyId) return
    setDeletingId(expenseToDelete.id)
    setError(null)
    try {
      await deleteExpense(expenseToDelete.id, companyId)
      setExpenseToDelete(null)
      await fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir.')
    } finally {
      setDeletingId(null)
    }
  }, [companyId, expenseToDelete, fetchData])

  if (companyLoading) return <LoadingScreen message="Carregando..." />
  if (companyError || !companyId) {
    return (
      <div className="p-6">
        <p className="text-amber-600">
          Sua conta não está vinculada a nenhuma empresa. Faça login com um usuário cadastrado em Cadastrar Acesso.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/cadastrar-fluxo-de-caixa" className={buttonPrimary}>
            <MdAdd className="h-5 w-5" aria-hidden />
            Cadastrar Fluxo
          </Link>
          <Link href="/home" className={buttonSecondary}>
            ← Voltar
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="w-48">
          <label htmlFor="filter-type" className={labelClass}>
            Por tipo
          </label>
          <select
            id="filter-type"
            className={input}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">Selecione o tipo</option>
            {EXPENSE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="w-48">
          <label htmlFor="filter-date" className={labelClass}>
            Por Data
          </label>
          <input
            id="filter-date"
            type="month"
            className={input}
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            title="Selecione o mês"
            aria-label="Selecione a data"
          />
        </div>
        <button type="button" className={buttonPrimary} onClick={() => {}} title="Relatórios">
          <MdPlayArrow className="h-5 w-5" aria-hidden />
          Relatórios
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E3A8A] border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-[8px] border border-[#E0E3E7] bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E0E3E7]">
              <thead>
                <tr>
                  <th className={tableHead}>Nome de Empresa</th>
                  <th className={tableHead}>Valor</th>
                  <th className={tableHead}>Data</th>
                  <th className={tableHead}>Tipo</th>
                  <th className={`${tableHead} text-right`}>Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E3E7] bg-white">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-[#57636C]">
                      Nenhuma conta a pagar no período.
                    </td>
                  </tr>
                ) : (
                  expenses.map((row) => (
                    <tr key={row.id} className="hover:bg-[#f8fafc]">
                      <td className={tableCell}>{row.payee_name}</td>
                      <td className={tableCell}>{formatCurrency(row.amount)}</td>
                      <td className={tableCellMuted}>{formatDate(row.due_date)}</td>
                      <td className={tableCellMuted}>{row.expense_type}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/fluxo-caixa/${row.id}`}
                            className="rounded-[8px] p-2 text-[#57636C] hover:bg-[#f1f4f8] hover:text-[#1E3A8A]"
                            title="Visualizar"
                            aria-label={`Visualizar ${row.payee_name}`}
                          >
                            <MdVisibility className="h-5 w-5" />
                          </Link>
                          <Link
                            href={`/fluxo-caixa/editar/${row.id}`}
                            className="rounded-[8px] p-2 text-[#57636C] hover:bg-[#f1f4f8] hover:text-[#1E3A8A]"
                            title="Editar"
                            aria-label={`Editar ${row.payee_name}`}
                          >
                            <MdEdit className="h-5 w-5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(row)}
                            disabled={deletingId === row.id}
                            className="rounded-[8px] p-2 text-[#57636C] hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Excluir"
                            aria-label={`Excluir ${row.payee_name}`}
                          >
                            <MdDelete className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        open={expenseToDelete !== null}
        onClose={() => setExpenseToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir despesa"
        confirmLabel="Excluir"
        variant="danger"
        loading={deletingId === expenseToDelete?.id}
      >
        {expenseToDelete && (
          <>
            Excluir &quot;{expenseToDelete.payee_name}&quot; ({formatCurrency(expenseToDelete.amount)})? Esta ação marca a despesa como excluída (exclusão lógica).
          </>
        )}
      </ConfirmModal>
    </div>
  )
}
