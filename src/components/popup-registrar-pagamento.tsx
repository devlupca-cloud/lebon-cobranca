'use client'

import { Button, CurrencyInput, Modal } from '@/components/ui'
import { recordPayment } from '@/lib/supabase/payments'
import type { ContractInstallment } from '@/types/database'
import { PAYMENT_METHOD } from '@/types/enums'
import { useEffect, useState } from 'react'

/**
 * Modal focado em pagar UMA parcela específica. Substitui a necessidade de
 * abrir o `popup-quitacao` inteiro (com tabela de todas as parcelas) só para
 * registrar o pagamento de uma parcela já selecionada na tabela principal.
 */

export type PopupRegistrarPagamentoProps = {
  open: boolean
  onClose: () => void
  /** Parcela a ser paga. */
  installment: ContractInstallment | null
  companyId: string | null | undefined
  /** Callback executado após sucesso para refazer a listagem externa. */
  onSuccess?: () => void | Promise<void>
}

const PAYMENT_METHOD_LABELS: Record<number, string> = {
  [PAYMENT_METHOD.CASH]: 'Dinheiro',
  [PAYMENT_METHOD.PIX]: 'PIX',
  [PAYMENT_METHOD.BANK_TRANSFER]: 'Transferência',
  [PAYMENT_METHOD.CARD]: 'Cartão',
  [PAYMENT_METHOD.BOLETO]: 'Boleto',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

export function PopupRegistrarPagamento({
  open,
  onClose,
  installment,
  companyId,
  onSuccess,
}: PopupRegistrarPagamentoProps) {
  const [paidAmount, setPaidAmount] = useState('')
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethodId, setPaymentMethodId] = useState<number>(PAYMENT_METHOD.PIX)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ao abrir, inicializa o valor com o saldo em aberto da parcela.
  useEffect(() => {
    if (!open || !installment) return
    const openAmount = Number(installment.amount) - Number(installment.amount_paid ?? 0)
    setPaidAmount(openAmount > 0 ? openAmount.toFixed(2).replace('.', ',') : '')
    setPaidAt(new Date().toISOString().split('T')[0])
    setPaymentMethodId(PAYMENT_METHOD.PIX)
    setNotes('')
    setError(null)
  }, [open, installment])

  if (!installment) return null

  const openAmount = Number(installment.amount) - Number(installment.amount_paid ?? 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId || !installment) return
    const amount = parseFloat(paidAmount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) {
      setError('Informe um valor válido.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await recordPayment({
        company_id: companyId,
        installment_id: installment.id,
        paid_amount: amount,
        paid_at: paidAt,
        payment_method_id: paymentMethodId,
        notes: notes.trim() || null,
      })
      await onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar pagamento.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={`Pagamento · Parcela ${installment.installment_number}`}
      size="md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="registrar-pagamento-form"
            variant="primary"
            disabled={submitting || !companyId}
          >
            {submitting ? 'Salvando...' : 'Registrar'}
          </Button>
        </>
      }
    >
      {!companyId ? (
        <p className="text-sm text-amber-600">Empresa não configurada.</p>
      ) : (
        <form id="registrar-pagamento-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Resumo da parcela */}
          <div className="grid grid-cols-2 gap-3 rounded-[8px] bg-[#f1f4f8] p-3 text-sm">
            <div>
              <p className="text-xs text-[#57636C]">Vencimento</p>
              <p className="font-medium text-[#14181B]">{formatDate(installment.due_date)}</p>
            </div>
            <div>
              <p className="text-xs text-[#57636C]">Em aberto</p>
              <p className="font-medium text-red-600">{formatCurrency(openAmount)}</p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0f1419]">Valor</label>
            <CurrencyInput value={paidAmount} onChange={setPaidAmount} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0f1419]">Data</label>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="h-[42px] w-full rounded-[8px] border border-[#E0E3E7] bg-white px-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0f1419]">Forma de pagamento</label>
            <select
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(Number(e.target.value))}
              className="h-[42px] w-full rounded-[8px] border border-[#E0E3E7] bg-white px-3 text-sm"
            >
              {Object.entries(PAYMENT_METHOD_LABELS).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0f1419]">Observação (opcional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-[42px] w-full rounded-[8px] border border-[#E0E3E7] bg-white px-3 text-sm"
              placeholder="Ex.: referente ao mês 05/2026"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}
    </Modal>
  )
}
