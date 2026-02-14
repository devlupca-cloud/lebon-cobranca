'use client'

import { Button, Input, LoadingScreen } from '@/components/ui'
import { useHeader } from '@/contexts/header-context'
import { useCompanyId } from '@/hooks/use-company-id'
import { card, input, label as labelClass, pageSubtitle, buttonPrimary, buttonSecondary } from '@/lib/design'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { MdArrowBack } from 'react-icons/md'
import { maskCurrency } from '@/lib/format'

type TipoAcordo = 'acordo_guiado' | 'acordo_negociado'

export default function EmprestimosPage() {
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()

  const [tipoAcordo, setTipoAcordo] = useState<TipoAcordo>('acordo_guiado')
  const [codigoCliente, setCodigoCliente] = useState('')
  const [nomeCliente, setNomeCliente] = useState('')
  const [taxaNP, setTaxaNP] = useState('')
  const [totalEmp, setTotalEmp] = useState('')
  const [diasAtraso, setDiasAtraso] = useState('')
  const [multas, setMultas] = useState('')
  const [juros, setJuros] = useState('')
  const [subtotal, setSubtotal] = useState('')
  const [saldo, setSaldo] = useState('')
  const [desconto, setDesconto] = useState('')
  const [adiantamento, setAdiantamento] = useState('')
  const [totalPagar, setTotalPagar] = useState('')
  const [observacao, setObservacao] = useState('')

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleAtualizarSaldo = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      await new Promise((r) => setTimeout(r, 500))
      setMessage('Empréstimos / acordos: salvamento em backend a ser definido. Campos apenas em tela.')
    } finally {
      setLoading(false)
    }
  }

  if (companyLoading) return <LoadingScreen message="Carregando..." />
  if (companyError || !companyId) {
    return (
      <div className="p-6">
        <p className="text-amber-600">Configure sua empresa para acessar esta tela.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <p className={pageSubtitle}>Acordo guiado ou negociado – dados do empréstimo</p>
        <Link href="/home" className={buttonSecondary + ' inline-flex items-center gap-2'}>
          <MdArrowBack className="h-5 w-5" />
          Voltar
        </Link>
      </div>

      <form onSubmit={handleAtualizarSaldo} className="space-y-6">
        {message && (
          <div className="rounded-[8px] border border-[#E0E3E7] bg-[#f1f4f8] px-4 py-2 text-sm text-[#57636C]">
            {message}
          </div>
        )}

        <div className={card + ' p-6'}>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#57636C]">
            Dados do empréstimo
          </h2>
          <div className="mb-6 flex gap-6">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="tipoAcordo"
                checked={tipoAcordo === 'acordo_guiado'}
                onChange={() => setTipoAcordo('acordo_guiado')}
                className="h-4 w-4 text-[#1E3A8A] focus:ring-[#1E3A8A]"
              />
              <span className="text-sm text-[#14181B]">Acordo Guiado</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="tipoAcordo"
                checked={tipoAcordo === 'acordo_negociado'}
                onChange={() => setTipoAcordo('acordo_negociado')}
                className="h-4 w-4 text-[#1E3A8A] focus:ring-[#1E3A8A]"
              />
              <span className="text-sm text-[#14181B]">Acordo Negociado</span>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass}>Código do cliente</label>
              <Input
                value={codigoCliente}
                onChange={(e) => setCodigoCliente(e.target.value)}
                placeholder="Digite o código do cliente"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Nome do cliente</label>
              <Input
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                placeholder="Digite o nome do cliente"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Taxa de NP</label>
              <Input
                value={taxaNP}
                onChange={(e) => setTaxaNP(e.target.value)}
                placeholder="Taxa de NP"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Total de Emp</label>
              <Input
                value={totalEmp}
                onChange={(e) => setTotalEmp(maskCurrency(e.target.value))}
                placeholder="Total"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Dias em atraso</label>
              <Input
                value={diasAtraso}
                onChange={(e) => setDiasAtraso(e.target.value.replace(/\D/g, ''))}
                placeholder="Total de dias em atraso"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Multas</label>
              <Input
                value={multas}
                onChange={(e) => setMultas(maskCurrency(e.target.value))}
                placeholder="Taxa de multa"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Juros</label>
              <Input
                value={juros}
                onChange={(e) => setJuros(maskCurrency(e.target.value))}
                placeholder="Total de juros"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Sub-total</label>
              <Input
                value={subtotal}
                onChange={(e) => setSubtotal(maskCurrency(e.target.value))}
                placeholder="Sub-total"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Saldo</label>
              <Input
                value={saldo}
                onChange={(e) => setSaldo(maskCurrency(e.target.value))}
                placeholder="Saldo"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Desconto</label>
              <Input
                value={desconto}
                onChange={(e) => setDesconto(maskCurrency(e.target.value))}
                placeholder="Desconto"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Adiantamento</label>
              <Input
                value={adiantamento}
                onChange={(e) => setAdiantamento(maskCurrency(e.target.value))}
                placeholder="Entrada / adiantamento"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Total a pagar</label>
              <Input
                value={totalPagar}
                onChange={(e) => setTotalPagar(maskCurrency(e.target.value))}
                placeholder="Total a pagar"
                className={input}
              />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelClass}>Observação</label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Observação"
              rows={3}
              className={input + ' min-h-[80px] resize-y'}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/home" className={buttonSecondary}>
            Voltar
          </Link>
          <Button
            type="button"
            onClick={() => (window.location.href = '/extrato-financeiro')}
            className={buttonSecondary}
          >
            Extrato
          </Button>
          <Button type="submit" disabled={loading} className={buttonPrimary}>
            {loading ? 'Salvando...' : 'Atualizar saldo'}
          </Button>
        </div>
      </form>
    </div>
  )
}
