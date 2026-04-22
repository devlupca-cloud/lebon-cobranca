'use client'

import { LoadingScreen } from '@/components/ui'
import { useHeader } from '@/contexts/header-context'
import { useCompanyId } from '@/hooks/use-company-id'
import { calcularParcela, formatCurrency } from '@/lib/simulacao'
import { createAgreement } from '@/lib/supabase/installments'
import { buttonPrimary, buttonSecondary, card, input, label as labelClass, pageSubtitle } from '@/lib/design'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'

type AgreementContext = {
  contractId: string
  installmentIds: string[]
}

export default function SimulacaoPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Carregando..." />}>
      <SimulacaoContent />
    </Suspense>
  )
}

function SimulacaoContent() {
  const { setTitle, setBreadcrumb } = useHeader()
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()
  const router = useRouter()
  const searchParams = useSearchParams()

  const agreement = useMemo<AgreementContext | null>(() => {
    const isAgreement = searchParams.get('agreement') === '1'
    const contractId = searchParams.get('contractId')
    const installmentIds = searchParams.get('installmentIds')
    if (!isAgreement || !contractId || !installmentIds) return null
    return {
      contractId,
      installmentIds: installmentIds.split(',').filter(Boolean),
    }
  }, [searchParams])

  useEffect(() => {
    const title = agreement ? 'Simulação de Acordo' : 'Simulação'
    setTitle(title)
    setBreadcrumb(
      agreement
        ? [
            { label: 'Home', href: '/home' },
            { label: 'Inadimplentes', href: '/inadimplentes01' },
            { label: 'Simulação de Acordo' },
          ]
        : [{ label: 'Home', href: '/home' }, { label: 'Simulação' }]
    )
    return () => {
      setTitle('')
      setBreadcrumb([])
    }
  }, [setTitle, setBreadcrumb, agreement])

  const initialValor = searchParams.get('valor') ?? ''
  const initialParcelas = searchParams.get('parcelas') ?? ''
  const initialTaxa = searchParams.get('taxa') ?? ''
  const initialFirstDue = searchParams.get('firstDueDate') ?? ''

  const [valor, setValor] = useState(initialValor)
  const [taxaJuros, setTaxaJuros] = useState(initialTaxa)
  const [parcelas, setParcelas] = useState(initialParcelas)
  const [primeiroVencimento, setPrimeiroVencimento] = useState(initialFirstDue)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valorNum = parseFloat(String(valor).replace(',', '.')) || 0
  const parcelasNum = Math.max(
    1,
    Math.floor(parseFloat(String(parcelas).replace(/\D/g, '')) || 0) || 1
  )
  const taxaNum = parseFloat(String(taxaJuros).replace(',', '.')) || 0

  const { parcela: valorPorParcela, total: valorTotal } = useMemo(
    () => calcularParcela(valorNum, parcelasNum, taxaNum),
    [valorNum, parcelasNum, taxaNum]
  )

  const novoContratoHref = useMemo(() => {
    const params = new URLSearchParams()
    // Propaga o VALOR TOTAL (somatória das parcelas) como valor do contrato.
    // Os juros simulados já estão embutidos no total; por isso a taxa vai zerada
    // no destino, e o form calcula parcela = total / N consistentemente.
    // Caso o usuário ainda não tenha uma simulação válida (sem valor/parcelas),
    // mantém o comportamento anterior (principal + taxa).
    const hasValidSim = valorNum > 0 && parcelasNum > 0
    if (hasValidSim) {
      params.set('valor', valorTotal.toFixed(2))
      params.set('taxa', '0')
      params.set('installmentAmount', valorPorParcela.toFixed(2))
      params.set('principal', valorNum.toFixed(2))
      if (taxaNum > 0) params.set('taxaSimulada', String(taxaNum).replace('.', ','))
    } else {
      if (valor.trim()) params.set('valor', valor.replace(',', '.'))
      if (taxaJuros.trim()) params.set('taxa', String(taxaNum).replace('.', ','))
    }
    if (parcelas.trim()) params.set('parcelas', String(parcelasNum))
    if (primeiroVencimento && /^\d{4}-\d{2}-\d{2}$/.test(primeiroVencimento)) {
      params.set('firstDueDate', primeiroVencimento)
    }
    const q = params.toString()
    return q ? `/novo-contrato?${q}` : '/novo-contrato'
  }, [
    valor,
    valorNum,
    parcelasNum,
    taxaJuros,
    taxaNum,
    primeiroVencimento,
    valorTotal,
    valorPorParcela,
  ])

  async function handleEfetivarAcordo() {
    if (!agreement || !companyId) return
    if (valorNum <= 0) {
      setError('Informe o valor do acordo.')
      return
    }
    if (!primeiroVencimento || !/^\d{4}-\d{2}-\d{2}$/.test(primeiroVencimento)) {
      setError('Informe a data do primeiro vencimento.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const newInstallments = buildNewInstallments(
        valorPorParcela,
        parcelasNum,
        primeiroVencimento
      )

      await createAgreement({
        companyId,
        contractId: agreement.contractId,
        originalInstallmentIds: agreement.installmentIds,
        newInstallments,
        notes: `Acordo gerado em simulação. Total ${formatCurrency(valorTotal)} em ${parcelasNum}x.`,
      })

      router.push(`/detalhes-contrato/${agreement.contractId}?acordo=ok`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao efetivar acordo.')
    } finally {
      setSubmitting(false)
    }
  }

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
        <p className={pageSubtitle}>
          {agreement
            ? `Acordo sobre ${agreement.installmentIds.length} parcela${agreement.installmentIds.length > 1 ? 's' : ''} em aberto. Ajuste o parcelamento e efetive.`
            : 'Simule parcelas e valores para um novo contrato'}
        </p>
        <Link
          href={agreement ? '/inadimplentes01' : '/contratos'}
          className="text-sm font-medium text-[#1E3A8A] hover:underline"
        >
          ← Voltar
        </Link>
      </div>

      {agreement && (
        <div className="mb-4 rounded-[8px] border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Modo <strong>Acordo</strong>. As parcelas originais serão marcadas como
          renegociadas e um novo cronograma será criado no mesmo contrato.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className={card + ' p-6'}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="sim-valor" className={labelClass}>
              Valor (R$)
            </label>
            <input
              id="sim-valor"
              type="text"
              inputMode="decimal"
              className={input}
              placeholder="Valor"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="sim-taxa" className={labelClass}>
              Taxa de Juros
            </label>
            <input
              id="sim-taxa"
              type="text"
              inputMode="decimal"
              className={input}
              placeholder="Em %"
              value={taxaJuros}
              onChange={(e) => setTaxaJuros(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="sim-parcelas" className={labelClass}>
              Parcelas
            </label>
            <input
              id="sim-parcelas"
              type="text"
              inputMode="numeric"
              className={input}
              placeholder="ex: 12x 500,00"
              value={parcelas}
              onChange={(e) => setParcelas(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="sim-valor-parcela" className={labelClass}>
              Valor por Parcela
            </label>
            <input
              id="sim-valor-parcela"
              type="text"
              className={input + ' bg-[#f8fafc]'}
              placeholder="Valor por Parcela"
              value={valorNum > 0 ? formatCurrency(valorPorParcela) : ''}
              readOnly
              aria-readonly
            />
          </div>
          <div>
            <label htmlFor="sim-valor-total" className={labelClass}>
              Valor Total
            </label>
            <input
              id="sim-valor-total"
              type="text"
              className={input + ' bg-[#f8fafc]'}
              placeholder="Valor Total"
              value={valorNum > 0 ? formatCurrency(valorTotal) : ''}
              readOnly
              aria-readonly
            />
          </div>
          <div>
            <label htmlFor="sim-primeiro-venc" className={labelClass}>
              Primeiro Vencimento
            </label>
            <input
              id="sim-primeiro-venc"
              type="date"
              className={input}
              value={primeiroVencimento}
              onChange={(e) => setPrimeiroVencimento(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {agreement ? (
            <>
              <button
                type="button"
                onClick={handleEfetivarAcordo}
                disabled={submitting || valorNum <= 0}
                className={buttonPrimary + ' inline-flex items-center'}
              >
                {submitting ? 'Efetivando...' : 'Efetivar Acordo'}
              </button>
              <Link href="/inadimplentes01" className={buttonSecondary}>
                Cancelar
              </Link>
            </>
          ) : (
            <Link
              href={novoContratoHref}
              className={buttonPrimary + ' inline-flex'}
            >
              Novo Contrato
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function buildNewInstallments(
  installmentAmount: number,
  count: number,
  firstDueDate: string
): Array<{ due_date: string; amount: number }> {
  const rows: Array<{ due_date: string; amount: number }> = []
  for (let i = 0; i < count; i++) {
    const d = new Date(firstDueDate + 'T00:00:00')
    d.setMonth(d.getMonth() + i)
    rows.push({
      due_date: d.toISOString().slice(0, 10),
      amount: Number(installmentAmount.toFixed(2)),
    })
  }
  return rows
}
