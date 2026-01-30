'use client'

import { Button, Input, Modal } from '@/components/ui'
import type { Customer } from '@/types/database'
import { useState } from 'react'

export type PopupSimulacaoProps = {
  open: boolean
  onClose: () => void
  customer?: Customer | null
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function PopupSimulacao({ open, onClose, customer }: PopupSimulacaoProps) {
  const [valor, setValor] = useState('')
  const [parcelas, setParcelas] = useState('12')
  const [taxa, setTaxa] = useState('')
  const [resultado, setResultado] = useState<{ parcela: number; total: number } | null>(null)

  const displayName =
    customer?.full_name ?? customer?.legal_name ?? customer?.trade_name ?? '—'

  function handleSimular() {
    const v = parseFloat(valor.replace(',', '.')) || 0
    const n = parseInt(parcelas, 10) || 1
    const t = parseFloat(taxa.replace(',', '.')) || 0
    if (v <= 0) {
      setResultado(null)
      return
    }
    const { parcela, total } = calcularParcela(v, n, t)
    setResultado({ parcela, total })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Simulação do Cliente"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Fechar
          </Button>
          <Button type="button" variant="primary" onClick={handleSimular}>
            Simular
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {customer && (
          <p className="text-sm text-zinc-600">
            Cliente: <strong>{displayName}</strong>
          </p>
        )}
        <Input
          label="Valor (R$)"
          type="text"
          inputMode="decimal"
          value={valor}
          onChange={(e) => {
            setValor(e.target.value)
            setResultado(null)
          }}
          placeholder="0,00"
        />
        <Input
          label="Número de parcelas"
          type="number"
          min={1}
          value={parcelas}
          onChange={(e) => {
            setParcelas(e.target.value)
            setResultado(null)
          }}
        />
        <Input
          label="Taxa de juros (% a.m.)"
          type="text"
          inputMode="decimal"
          value={taxa}
          onChange={(e) => {
            setTaxa(e.target.value)
            setResultado(null)
          }}
          placeholder="0,00"
        />
        {resultado != null && (
          <div className="rounded border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-medium text-zinc-700">Resultado da simulação</p>
            <p className="mt-2 text-zinc-900">
              Parcela mensal: <strong>{formatCurrency(resultado.parcela)}</strong>
            </p>
            <p className="mt-1 text-zinc-900">
              Total: <strong>{formatCurrency(resultado.total)}</strong>
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
