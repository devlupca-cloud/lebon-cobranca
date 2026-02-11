'use client'

import { Button, Modal } from '@/components/ui'
import { card } from '@/lib/design'
import { useEffect, useState } from 'react'

/** Objeto com dados mínimos para exibir nome do cliente (Customer ou item do autocomplete). */
export type CustomerDisplay = {
  full_name?: string | null
  legal_name?: string | null
  trade_name?: string | null
}

export type SimulacaoValues = {
  valor: string
  parcelas: string
  firstDueDate: string
  taxa: string
}

export type PopupSimulacaoProps = {
  open: boolean
  onClose: () => void
  customer?: CustomerDisplay | null
  /** Valores iniciais (ex.: vindos do formulário Novo Contrato) */
  initialValor?: string
  initialParcelas?: string
  initialTaxa?: string
  initialFirstDueDate?: string
  /** Chamado ao clicar em "Salvar essa seleção" — aplica os valores no formulário e volta para a página */
  onApply?: (values: SimulacaoValues) => void
}

/** Parcela mensal (PMT): valor * (i * (1+i)^n) / ((1+i)^n - 1), i = taxa mensal */
function calcularParcela(
  valorPrincipal: number,
  numParcelas: number,
  taxaMensalPercent: number
): { parcela: number; total: number } {
  if (valorPrincipal <= 0 || numParcelas <= 0) {
    return { parcela: 0, total: 0 }
  }
  const i = taxaMensalPercent / 100
  if (i <= 0) {
    const parcela = valorPrincipal / numParcelas
    return { parcela, total: valorPrincipal }
  }
  const factor = Math.pow(1 + i, numParcelas)
  const parcela = valorPrincipal * ((i * factor) / (factor - 1))
  const total = parcela * numParcelas
  return { parcela, total }
}

/** Soma meses a uma data ISO (yyyy-mm-dd). */
function addMonths(isoDate: string, months: number): string {
  const d = new Date(isoDate + 'T12:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

/** Formata yyyy-mm-dd para DD/MM */
function formatDDMM(isoDate: string): string {
  if (!isoDate || isoDate.length < 10) return '—'
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}`
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export type ParcelaSimulada = {
  numero: number
  valor: number
  dueDate: string
}

/** Formata yyyy-mm-dd para DD/MM/AAAA */
function formatDateFull(iso: string): string {
  if (!iso || iso.length < 10) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function PopupSimulacao({
  open,
  onClose,
  customer,
  initialValor,
  initialParcelas,
  initialTaxa,
  initialFirstDueDate,
  onApply,
}: PopupSimulacaoProps) {
  const [valor, setValor] = useState('')
  const [parcelas, setParcelas] = useState('12')
  const [taxa, setTaxa] = useState('')
  const [firstDueDate, setFirstDueDate] = useState('')
  const [listaParcelas, setListaParcelas] = useState<ParcelaSimulada[]>([])
  /** Modo travado = só leitura (valores do contrato). Editar = libera campos para testar outras combinações */
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (open) {
      if (initialValor != null) setValor(initialValor)
      if (initialParcelas != null) setParcelas(initialParcelas)
      if (initialTaxa != null) setTaxa(initialTaxa)
      if (initialFirstDueDate != null) setFirstDueDate(initialFirstDueDate)
      setIsEditing(!(initialValor?.trim() && initialParcelas?.trim()))
    } else {
      setListaParcelas([])
      setIsEditing(false)
    }
  }, [open, initialValor, initialParcelas, initialTaxa, initialFirstDueDate])

  /** Ao abrir com valor e parcelas preenchidos (ex.: da tela Novo Contrato), gera a simulação na hora */
  useEffect(() => {
    if (!open) return
    const v = parseFloat(String(initialValor ?? '').replace(',', '.')) || 0
    const n = Math.max(1, parseInt(initialParcelas ?? '', 10) || 1)
    const t = parseFloat(String(initialTaxa ?? '').replace(',', '.')) || 0
    if (v <= 0) return
    const { parcela } = calcularParcela(v, n, t)
    const baseDate =
      initialFirstDueDate && /^\d{4}-\d{2}-\d{2}$/.test(initialFirstDueDate)
        ? initialFirstDueDate
        : addMonths(new Date().toISOString().slice(0, 10), 1)
    const lista: ParcelaSimulada[] = []
    for (let k = 1; k <= n; k++) {
      lista.push({
        numero: k,
        valor: parcela,
        dueDate: addMonths(baseDate, k - 1),
      })
    }
    setListaParcelas(lista)
  }, [open, initialValor, initialParcelas, initialTaxa, initialFirstDueDate])

  const displayName =
    customer?.full_name ?? customer?.legal_name ?? customer?.trade_name ?? '—'

  function handleSimular() {
    const v = parseFloat(String(valor).replace(',', '.')) || 0
    const n = Math.max(1, parseInt(parcelas, 10) || 1)
    const t = parseFloat(String(taxa).replace(',', '.')) || 0
    if (v <= 0) {
      setListaParcelas([])
      return
    }
    const { parcela } = calcularParcela(v, n, t)
    const baseDate = firstDueDate && /^\d{4}-\d{2}-\d{2}$/.test(firstDueDate)
      ? firstDueDate
      : addMonths(new Date().toISOString().slice(0, 10), 1)
    const lista: ParcelaSimulada[] = []
    for (let k = 1; k <= n; k++) {
      lista.push({
        numero: k,
        valor: parcela,
        dueDate: addMonths(baseDate, k - 1),
      })
    }
    setListaParcelas(lista)
  }

  function handleSalvarSelecao() {
    onApply?.({ valor, parcelas, firstDueDate, taxa })
    onClose()
  }

  const valorNum = parseFloat(String(valor).replace(',', '.'))
  const valorFormatado = Number.isFinite(valorNum) && valorNum > 0 ? formatCurrency(valorNum) : (valor || '—')
  const taxaFormatada = taxa.trim() ? `${taxa.trim()}%` : '—'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Simulação do Cliente"
      footer={
        <>
          {!isEditing ? (
            <>
              <Button type="button" variant="secondary" onClick={onClose}>
                Fechar
              </Button>
              <Button type="button" variant="primary" onClick={() => setIsEditing(true)}>
                Editar e testar outras combinações
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={onClose}>
                Fechar
              </Button>
              <Button type="button" variant="secondary" onClick={handleSimular}>
                Simular
              </Button>
              {onApply && (
                <Button type="button" variant="primary" onClick={handleSalvarSelecao}>
                  Salvar essa seleção e voltar
                </Button>
              )}
            </>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-[#57636C]">
          {customer ? (
            <>Cliente: <strong className="text-[#14181B]">{displayName}</strong></>
          ) : (
            'Cliente não selecionado'
          )}
        </p>

        {!isEditing ? (
          /* Modo travado: valores em só leitura */
          <div className={card + ' p-4 space-y-3'}>
            <h3 className="text-sm font-semibold text-[#14181B]">Dados da simulação</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[#57636C]">Valor (R$)</dt>
                <dd className="font-medium text-[#14181B]">{valorFormatado}</dd>
              </div>
              <div>
                <dt className="text-[#57636C]">Número de parcelas</dt>
                <dd className="font-medium text-[#14181B]">{parcelas || '—'}</dd>
              </div>
              <div>
                <dt className="text-[#57636C]">Data do 1º vencimento</dt>
                <dd className="font-medium text-[#14181B]">{firstDueDate ? formatDateFull(firstDueDate) : '—'}</dd>
              </div>
              <div>
                <dt className="text-[#57636C]">Taxa de juros (% a.m.)</dt>
                <dd className="font-medium text-[#14181B]">{taxaFormatada}</dd>
              </div>
            </dl>
          </div>
        ) : (
          /* Modo edição: campos para testar outras combinações */
          <div className="space-y-4">
            <div className={card + ' p-4'}>
              <h3 className="text-sm font-semibold text-[#14181B] mb-3">Alterar valores para simular</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#14181B]">Valor (R$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={valor}
                    onChange={(e) => { setValor(e.target.value); setListaParcelas([]) }}
                    placeholder="0,00"
                    className="h-[42px] w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-[#0f1419] placeholder:text-[#94a3b8] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#14181B]">Número de parcelas</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={parcelas}
                    onChange={(e) => { setParcelas(e.target.value); setListaParcelas([]) }}
                    placeholder="12"
                    className="h-[42px] w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-[#0f1419] placeholder:text-[#94a3b8] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#14181B]">Data do 1º vencimento</label>
                  <input
                    type="date"
                    value={firstDueDate}
                    onChange={(e) => { setFirstDueDate(e.target.value); setListaParcelas([]) }}
                    className="h-[42px] w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-[#0f1419] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#14181B]">Taxa de juros (% a.m.)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={taxa}
                    onChange={(e) => { setTaxa(e.target.value); setListaParcelas([]) }}
                    placeholder="0,00"
                    className="h-[42px] w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-[#0f1419] placeholder:text-[#94a3b8] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {listaParcelas.length > 0 && (
          <div className={card + ' p-4'}>
            <h3 className="text-sm font-semibold text-[#14181B] mb-3">Parcelas</h3>
            <ul className="space-y-2 max-h-[240px] overflow-y-auto">
              {listaParcelas.map((item) => (
                <li
                  key={item.numero}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm text-[#14181B]"
                >
                  <span>
                    {item.numero}ª Parcela {formatCurrency(item.valor)}
                  </span>
                  <span className="text-[#57636C]">
                    Data: {formatDDMM(item.dueDate)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  )
}
