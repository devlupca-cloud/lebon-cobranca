'use client'

import { LoadingScreen } from '@/components/ui'
import { useCompanyId } from '@/hooks/use-company-id'
import { calcularParcela, formatCurrency } from '@/lib/simulacao'
import { buttonPrimary, card, input, label as labelClass, pageSubtitle, pageTitle } from '@/lib/design'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { MdSwapVert } from 'react-icons/md'

export default function SimulacaoPage() {
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()
  const [valor, setValor] = useState('')
  const [taxaJuros, setTaxaJuros] = useState('')
  const [parcelas, setParcelas] = useState('')
  const [primeiroVencimento, setPrimeiroVencimento] = useState('')

  const valorNum = parseFloat(String(valor).replace(',', '.')) || 0
  const parcelasNum = Math.max(1, Math.floor(parseFloat(String(parcelas).replace(/\D/g, '')) || 0) || 1)
  const taxaNum = parseFloat(String(taxaJuros).replace(',', '.')) || 0

  const { parcela: valorPorParcela, total: valorTotal } = useMemo(
    () => calcularParcela(valorNum, parcelasNum, taxaNum),
    [valorNum, parcelasNum, taxaNum]
  )

  const novoContratoHref = useMemo(() => {
    const params = new URLSearchParams()
    if (valor.trim()) params.set('valor', valor.replace(',', '.'))
    if (parcelas.trim()) params.set('parcelas', String(parcelasNum))
    if (taxaJuros.trim()) params.set('taxa', String(taxaNum).replace('.', ','))
    if (primeiroVencimento && /^\d{4}-\d{2}-\d{2}$/.test(primeiroVencimento)) {
      params.set('firstDueDate', primeiroVencimento)
    }
    const q = params.toString()
    return q ? `/novo-contrato?${q}` : '/novo-contrato'
  }, [valor, parcelasNum, taxaJuros, primeiroVencimento])

  if (companyLoading) return <LoadingScreen message="Carregando..." />
  if (companyError || !companyId) {
    return (
      <div className="p-6">
        <h1 className={pageTitle}>Simulação</h1>
        <p className="mt-2 text-amber-600">
          Sua conta não está vinculada a nenhuma empresa. Faça login com um usuário cadastrado em Cadastrar Acesso.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <MdSwapVert className="h-7 w-7 text-[#1E3A8A]" aria-hidden />
          <div>
            <h1 className={pageTitle}>Simulação</h1>
            <p className={pageSubtitle}>
              Simule parcelas e valores para um novo contrato
            </p>
          </div>
        </div>
        <Link
          href="/contratos"
          className="text-sm font-medium text-[#1E3A8A] hover:underline"
        >
          ← Voltar
        </Link>
      </div>

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

        <div className="mt-6">
          <Link
            href={novoContratoHref}
            className={buttonPrimary + ' inline-flex'}
          >
            Novo Contrato
          </Link>
        </div>
      </div>
    </div>
  )
}
