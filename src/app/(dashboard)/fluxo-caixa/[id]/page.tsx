'use client'

import { LoadingScreen } from '@/components/ui'
import { useHeader } from '@/contexts/header-context'
import { useCompanyId } from '@/hooks/use-company-id'
import { getExpenseById } from '@/lib/supabase/expenses'
import type { CompanyExpense } from '@/types/database'
import { buttonSecondary, card, tableCell, tableCellMuted } from '@/lib/design'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

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

export default function DetalheContaAPagarPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''
  const { setTitle, setBreadcrumb } = useHeader()
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()
  const [expense, setExpense] = useState<CompanyExpense | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTitle('Conta a pagar')
    setBreadcrumb([{ label: 'Home', href: '/home' }, { label: 'Contas a pagar', href: '/fluxo-caixa' }, { label: 'Detalhe' }])
    return () => { setTitle(''); setBreadcrumb([]) }
  }, [setTitle, setBreadcrumb])

  const fetchExpense = useCallback(async () => {
    if (!companyId || !id) return
    setLoading(true)
    setError(null)
    try {
      const row = await getExpenseById(id, companyId)
      setExpense(row ?? null)
      if (!row) setError('Conta não encontrada.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar.')
    } finally {
      setLoading(false)
    }
  }, [companyId, id])

  useEffect(() => {
    if (!companyId || !id) return
    fetchExpense()
  }, [companyId, id, fetchExpense])

  if (companyLoading || loading) return <LoadingScreen message="Carregando..." />
  if (companyError || !companyId) {
    return (
      <div className="p-6">
        <p className="text-amber-600">Sua conta não está vinculada a nenhuma empresa.</p>
      </div>
    )
  }

  if (error || !expense) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error ?? 'Não encontrada.'}</p>
        <Link href="/fluxo-caixa" className={buttonSecondary + ' mt-4 inline-flex'}>
          ← Voltar
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-3">
          <Link href={`/fluxo-caixa/editar/${id}`} className={buttonSecondary}>
            Editar
          </Link>
          <Link href="/fluxo-caixa" className={buttonSecondary}>
            ← Voltar
          </Link>
        </div>
      </div>

      <div className={card + ' max-w-xl p-6'}>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className={tableCellMuted + ' text-xs uppercase'}>Nome de Empresa</dt>
            <dd className={tableCell + ' font-medium'}>{expense.payee_name}</dd>
          </div>
          <div>
            <dt className={tableCellMuted + ' text-xs uppercase'}>Valor</dt>
            <dd className={tableCell + ' font-medium'}>{formatCurrency(expense.amount)}</dd>
          </div>
          <div>
            <dt className={tableCellMuted + ' text-xs uppercase'}>Data</dt>
            <dd className={tableCell}>{formatDate(expense.due_date)}</dd>
          </div>
          <div>
            <dt className={tableCellMuted + ' text-xs uppercase'}>Tipo</dt>
            <dd className={tableCell}>{expense.expense_type}</dd>
          </div>
          {expense.notes && (
            <div className="sm:col-span-2">
              <dt className={tableCellMuted + ' text-xs uppercase'}>Observações</dt>
              <dd className={tableCell}>{expense.notes}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}
