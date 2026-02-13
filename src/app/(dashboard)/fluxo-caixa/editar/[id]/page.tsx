'use client'

import { Button } from '@/components/ui'
import { LoadingScreen } from '@/components/ui'
import { useHeader } from '@/contexts/header-context'
import { useCompanyId } from '@/hooks/use-company-id'
import { getExpenseById, updateExpense } from '@/lib/supabase/expenses'
import { buttonPrimary, buttonSecondary, card, input, label as labelClass } from '@/lib/design'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { MdDescription } from 'react-icons/md'

export default function EditarFluxoPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : ''
  const { setTitle, setBreadcrumb } = useHeader()
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()
  const [empresa, setEmpresa] = useState('')

  useEffect(() => {
    setTitle('Editar conta a pagar')
    setBreadcrumb([{ label: 'Home', href: '/home' }, { label: 'Contas a pagar', href: '/fluxo-caixa' }, { label: 'Editar' }])
    return () => { setTitle(''); setBreadcrumb([]) }
  }, [setTitle, setBreadcrumb])
  const [nome, setNome] = useState('')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')
  const [diaPagamento, setDiaPagamento] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchExpense = useCallback(async () => {
    if (!companyId || !id) return
    setLoading(true)
    setError(null)
    try {
      const row = await getExpenseById(id, companyId)
      if (row) {
        setEmpresa(row.payee_name)
        setNome(row.contact_name ?? '')
        setTitulo(row.title ?? '')
        setDescricao(row.notes ?? '')
        setValor(String(row.amount).replace('.', ','))
        setDataVencimento(row.due_date?.slice(0, 10) ?? '')
        setDiaPagamento(row.payment_date?.slice(0, 10) ?? '')
      } else {
        setError('Conta não encontrada.')
      }
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId || !id) return
    const payeeName = empresa.trim()
    const value = parseFloat(String(valor).replace(',', '.'))
    if (!payeeName) {
      setError('Empresa é obrigatória.')
      return
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('Valor deve ser maior que zero.')
      return
    }
    if (!dataVencimento || dataVencimento.length < 10) {
      setError('Data de vencimento é obrigatória.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await updateExpense(id, companyId, {
        payee_name: payeeName,
        amount: value,
        due_date: dataVencimento.slice(0, 10),
        expense_type: 'Outros',
        notes: descricao.trim() || null,
        title: titulo.trim() || null,
        contact_name: nome.trim() || null,
        payment_date: diaPagamento ? diaPagamento.slice(0, 10) : null,
      })
      router.push('/fluxo-caixa')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSubmitting(false)
    }
  }

  if (companyLoading || loading) return <LoadingScreen message="Carregando..." />
  if (companyError || !companyId) {
    return (
      <div className="p-6">
        <p className="text-amber-600">Sua conta não está vinculada a nenhuma empresa.</p>
      </div>
    )
  }

  if (!id) {
    return (
      <div className="p-6">
        <p className="text-red-600">ID inválido.</p>
        <Link href="/fluxo-caixa" className={buttonSecondary + ' mt-4 inline-flex'}>
          Voltar
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-end gap-4">
        <Link href="/fluxo-caixa" className={buttonSecondary}>
          ← Voltar
        </Link>
      </div>

      <div className={card + ' max-w-2xl p-6'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="empresa" className={labelClass}>
                Empresa
              </label>
              <input
                id="empresa"
                type="text"
                className={input}
                placeholder="Digite o Nome da Empresa"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="nome" className={labelClass}>
                Nome
              </label>
              <input
                id="nome"
                type="text"
                className={input}
                placeholder="Nome do Usuario"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="titulo" className={labelClass}>
                Título
              </label>
              <input
                id="titulo"
                type="text"
                className={input}
                placeholder="Título"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="descricao" className={labelClass}>
                Descrição
              </label>
              <textarea
                id="descricao"
                rows={3}
                className={input + ' min-h-[80px] resize-y'}
                placeholder="Descrição"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="valor" className={labelClass}>
                Valor
              </label>
              <input
                id="valor"
                type="text"
                inputMode="decimal"
                className={input}
                placeholder="Valor"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="data-vencimento" className={labelClass}>
                Data de Vencimento
              </label>
              <input
                id="data-vencimento"
                type="date"
                className={input}
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="dia-pagamento" className={labelClass}>
                Dia Pagamento
              </label>
              <input
                id="dia-pagamento"
                type="date"
                className={input}
                value={diaPagamento}
                onChange={(e) => setDiaPagamento(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={submitting} className={buttonPrimary}>
              {submitting ? 'Salvando...' : 'Salvar Documento'}
            </Button>
            <Link href="/fluxo-caixa" className={buttonSecondary}>
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
