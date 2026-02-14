'use client'

import { Button, ConfirmModal, Modal } from '@/components/ui'
import { getInstallmentsByContract, getContractById, checkAndCloseContract } from '@/lib/supabase/contracts'
import { recordPayment, quitContract, getPaymentsByInstallment, deletePayment } from '@/lib/supabase/payments'
import type { ContractInstallment } from '@/types/database'
import { INSTALLMENT_STATUS, PAYMENT_METHOD } from '@/types/enums'
import { Fragment, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { MdReceipt, MdDescription, MdSwapHoriz, MdWarning, MdCheck } from 'react-icons/md'

export type PopupQuitacaoProps = {
  open: boolean
  onClose: () => void
  /** ID do contrato para quitação */
  contractId?: string | null
  /** company_id para registrar pagamento */
  companyId?: string | null
  /** Callback após sucesso (ex.: refresh da lista de contratos) */
  onSuccess?: () => void
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

const STATUS_LABELS: Record<number, string> = {
  [INSTALLMENT_STATUS.OPEN]: 'Aberto',
  [INSTALLMENT_STATUS.PARTIAL]: 'Parcial',
  [INSTALLMENT_STATUS.PAID]: 'Pago',
  [INSTALLMENT_STATUS.OVERDUE]: 'Vencido',
  [INSTALLMENT_STATUS.CANCELED]: 'Cancelado',
  [INSTALLMENT_STATUS.RENEGOTIATED]: 'Renegociado',
}

const PAYMENT_METHOD_LABELS: Record<number, string> = {
  [PAYMENT_METHOD.CASH]: 'Dinheiro',
  [PAYMENT_METHOD.PIX]: 'PIX',
  [PAYMENT_METHOD.BANK_TRANSFER]: 'Transferência',
  [PAYMENT_METHOD.CARD]: 'Cartão',
  [PAYMENT_METHOD.BOLETO]: 'Boleto',
}

export function PopupQuitacao({
  open,
  onClose,
  contractId,
  companyId,
  onSuccess,
}: PopupQuitacaoProps) {
  const [installments, setInstallments] = useState<ContractInstallment[]>([])
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quitacaoMessage, setQuitacaoMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null)
  const [payingInstallmentId, setPayingInstallmentId] = useState<string | null>(null)
  const [paymentForm, setPaymentForm] = useState<{
    paid_amount: string
    paid_at: string
    payment_method_id: number
    notes: string
  }>({
    paid_amount: '',
    paid_at: new Date().toISOString().split('T')[0],
    payment_method_id: PAYMENT_METHOD.PIX,
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [expandedInstallmentId, setExpandedInstallmentId] = useState<string | null>(null)
  const [markingAsPaidId, setMarkingAsPaidId] = useState<string | null>(null)
  const [paymentToRevertId, setPaymentToRevertId] = useState<string | null>(null)
  const [confirmQuitarOpen, setConfirmQuitarOpen] = useState(false)

  const fetchData = useCallback(async () => {
    if (!contractId || !open) return
    setLoading(true)
    setError(null)
    setQuitacaoMessage(null)
    try {
      const list = await getInstallmentsByContract(contractId)
      setInstallments(list)
      if (companyId) {
        const contract = await getContractById(contractId, companyId)
        setCustomerId(contract?.customer_id ?? null)
      } else {
        setCustomerId(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar parcelas.')
    } finally {
      setLoading(false)
    }
  }, [contractId, companyId, open])

  useEffect(() => {
    if (open && contractId) fetchData()
  }, [open, contractId, fetchData])

  const handleOpenPaymentForm = (inst: ContractInstallment) => {
    const openAmount = Number(inst.amount) - Number(inst.amount_paid)
    if (openAmount <= 0) return
    setPayingInstallmentId(inst.id)
    setPaymentForm({
      paid_amount: String(openAmount.toFixed(2)).replace('.', ','),
      paid_at: new Date().toISOString().split('T')[0],
      payment_method_id: PAYMENT_METHOD.PIX,
      notes: '',
    })
    setPaymentError(null)
  }

  const handleMarkAsPaid = async (inst: ContractInstallment) => {
    if (!companyId) return
    const openAmount = Number(inst.amount) - Number(inst.amount_paid)
    if (openAmount <= 0) return
    setMarkingAsPaidId(inst.id)
    setPaymentError(null)
    setQuitacaoMessage(null)
    try {
      await recordPayment({
        company_id: companyId,
        installment_id: inst.id,
        paid_amount: openAmount,
        paid_at: new Date().toISOString().split('T')[0],
        payment_method_id: PAYMENT_METHOD.PIX,
        notes: 'Marcado como pago',
      })
      setQuitacaoMessage({ type: 'success', text: `Parcela ${inst.installment_number} marcada como paga.` })
      // Atualização otimista: atualiza a parcela no estado sem refetch
      const paidAt = new Date().toISOString().split('T')[0]
      setInstallments((prev) =>
        prev.map((i) =>
          i.id === inst.id
            ? {
                ...i,
                amount_paid: Number(inst.amount),
                status_id: INSTALLMENT_STATUS.PAID,
                paid_at: paidAt,
              }
            : i
        )
      )
    } catch (e) {
      const err = e as { message?: string; details?: string }
      const msg = err?.message ?? (e instanceof Error ? e.message : 'Erro ao marcar parcela como paga.')
      setPaymentError(err?.details ? `${msg}: ${err.details}` : msg)
    } finally {
      setMarkingAsPaidId(null)
    }
  }

  const handleClosePaymentForm = () => {
    setPayingInstallmentId(null)
    setPaymentError(null)
  }

  // Refetch da lista de contratos só ao fechar o modal (evita mil requests ao marcar várias parcelas)
  const handleCloseModal = useCallback(() => {
    onSuccess?.()
    onClose()
  }, [onSuccess, onClose])

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId || !payingInstallmentId) return
    const amount = parseFloat(paymentForm.paid_amount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) {
      setPaymentError('Informe um valor válido.')
      return
    }
    setSubmitting(true)
    setPaymentError(null)
    try {
      await recordPayment({
        company_id: companyId,
        installment_id: payingInstallmentId,
        paid_amount: amount,
        paid_at: paymentForm.paid_at,
        payment_method_id: paymentForm.payment_method_id,
        notes: paymentForm.notes.trim() || null,
      })
      handleClosePaymentForm()
      await fetchData()
    } catch (e) {
      setPaymentError(e instanceof Error ? e.message : 'Erro ao registrar pagamento.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmRevertPayment = async () => {
    if (!paymentToRevertId || !companyId) return
    setSubmitting(true)
    setPaymentError(null)
    try {
      await deletePayment(paymentToRevertId, companyId)
      setPaymentToRevertId(null)
      await fetchData()
      setExpandedInstallmentId(null)
    } catch (e) {
      setPaymentError(e instanceof Error ? e.message : 'Erro ao estornar.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleQuitacaoTotal = async () => {
    if (!contractId || !companyId) return
    setSubmitting(true)
    setQuitacaoMessage(null)
    try {
      const closed = await checkAndCloseContract(contractId, companyId)
      if (closed) {
        setQuitacaoMessage({ type: 'success', text: 'Contrato quitado com sucesso.' })
        await fetchData()
      } else {
        const hasOpen = installments.some(
          (i) =>
            i.status_id !== INSTALLMENT_STATUS.CANCELED &&
            Number(i.amount) - Number(i.amount_paid) > 0
        )
        setQuitacaoMessage({
          type: 'info',
          text: hasOpen ? 'Pague todas as parcelas antes de quitar o contrato.' : 'Nenhuma parcela ativa para quitar.',
        })
      }
    } catch (e) {
      setQuitacaoMessage({
        type: 'info',
        text: e instanceof Error ? e.message : 'Erro ao quitar contrato.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  /** Quitar contrato: marca todas as parcelas em aberto como pagas e fecha o contrato (uma RPC). */
  const handleQuitarContratoClick = () => {
    const openCount = installments.filter(
      (i) => i.status_id !== INSTALLMENT_STATUS.CANCELED && Number(i.amount) - Number(i.amount_paid) > 0
    ).length
    if (openCount === 0) {
      setQuitacaoMessage({ type: 'info', text: 'Não há parcelas em aberto para quitar.' })
      return
    }
    setConfirmQuitarOpen(true)
  }

  const handleConfirmQuitarContrato = async () => {
    if (!contractId || !companyId) return
    setSubmitting(true)
    setQuitacaoMessage(null)
    setPaymentError(null)
    setConfirmQuitarOpen(false)
    try {
      const result = await quitContract(contractId, companyId, PAYMENT_METHOD.PIX)
      setQuitacaoMessage({
        type: 'success',
        text: result.payments_count > 0
          ? `${result.payments_count} parcela(s) marcada(s) como paga(s). Contrato quitado.`
          : 'Contrato quitado com sucesso.',
      })
      await fetchData()
    } catch (e) {
      const err = e as { message?: string }
      setPaymentError(err?.message ?? 'Erro ao quitar contrato.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!contractId) {
    return (
      <Modal open={open} onClose={handleCloseModal} title="Quitação" footer={<Button type="button" variant="primary" onClick={handleCloseModal}>Fechar</Button>}>
        <p className="text-sm text-zinc-600">Nenhum contrato selecionado.</p>
      </Modal>
    )
  }

  const openCountQuitar = installments.filter(
    (i) => i.status_id !== INSTALLMENT_STATUS.CANCELED && Number(i.amount) - Number(i.amount_paid) > 0
  ).length

  return (
    <>
    <Modal
      open={open}
      onClose={handleCloseModal}
      title="Quitação"
      footer={
        <Button type="button" variant="primary" onClick={handleCloseModal}>
          Fechar
        </Button>
      }
    >
      <div className="space-y-4">
        {!companyId ? (
          <p className="text-sm text-amber-600">Empresa não configurada. Não é possível registrar pagamentos.</p>
        ) : null}

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {paymentError && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {paymentError}
          </div>
        )}

        {quitacaoMessage && (
          <div
            className={`rounded-[8px] px-4 py-2 text-sm ${
              quitacaoMessage.type === 'success' ? 'border border-[#249689] bg-[#249689]/10 text-[#249689]' : 'border border-[#E0E3E7] bg-[#f1f4f8] text-[#57636C]'
            }`}
          >
            {quitacaoMessage.text}
          </div>
        )}

        {/* Ações rápidas */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleQuitarContratoClick}
            disabled={!companyId || submitting}
            className="inline-flex items-center gap-1.5"
          >
            <MdReceipt className="h-4 w-4" />
            Quitar contrato
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleQuitacaoTotal}
            disabled={!companyId || submitting}
            className="inline-flex items-center gap-1.5"
            title="Só fecha o contrato se todas as parcelas já estiverem pagas"
          >
            Fechar se já quitado
          </Button>
          <Link
            href="/gerardocumentosnovo"
            className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#E0E3E7] bg-white px-3 py-2 text-sm font-medium text-[#1E3A8A] hover:bg-[#f1f4f8]"
          >
            <MdDescription className="h-4 w-4" />
            Gerar termo de quitação
          </Link>
          {customerId && (
            <Link
              href={`/novo-contrato?customerId=${customerId}`}
              className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#E0E3E7] bg-white px-3 py-2 text-sm font-medium text-[#1E3A8A] hover:bg-[#f1f4f8]"
            >
              <MdSwapHoriz className="h-4 w-4" />
              Renegociação
            </Link>
          )}
          <Link
            href="/inadimplentes01"
            className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#E0E3E7] bg-white px-3 py-2 text-sm font-medium text-[#1E3A8A] hover:bg-[#f1f4f8]"
          >
            <MdWarning className="h-4 w-4" />
            Inadimplentes
          </Link>
        </div>

        <p className="text-xs text-[#57636C]">
          Pagamento de parcelas: use o botão &quot;Pagar&quot; em cada parcela na tabela abaixo.
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E3A8A] border-t-transparent" />
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500">Parcela</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500">Vencimento</th>
                  <th className="px-3 py-2 text-right font-medium text-zinc-500">Valor</th>
                  <th className="px-3 py-2 text-right font-medium text-zinc-500">Pago</th>
                  <th className="px-3 py-2 text-right font-medium text-zinc-500">Em aberto</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-500">Status</th>
                  <th className="px-3 py-2 text-right font-medium text-zinc-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {installments.map((inst) => {
                  const amount = Number(inst.amount)
                  const paid = Number(inst.amount_paid)
                  const openAmount = amount - paid
                  const isOpen = openAmount > 0 && inst.status_id !== INSTALLMENT_STATUS.CANCELED
                  const isExpanded = expandedInstallmentId === inst.id
                  return (
                    <Fragment key={inst.id}>
                      <tr className="hover:bg-zinc-50">
                        <td className="px-3 py-2 text-zinc-900">{inst.installment_number}</td>
                        <td className="px-3 py-2 text-zinc-600">{formatDate(inst.due_date)}</td>
                        <td className="px-3 py-2 text-right text-zinc-600">{formatCurrency(amount)}</td>
                        <td className="px-3 py-2 text-right text-zinc-600">{formatCurrency(paid)}</td>
                        <td className="px-3 py-2 text-right font-medium text-zinc-900">{formatCurrency(openAmount)}</td>
                        <td className="px-3 py-2 text-zinc-600">{STATUS_LABELS[inst.status_id] ?? inst.status_id}</td>
                        <td className="px-3 py-2 text-right">
                          {isOpen && companyId && (
                            <button
                              type="button"
                              onClick={() => handleMarkAsPaid(inst)}
                              disabled={markingAsPaidId !== null}
                              aria-label="Marcar como pago"
                              title="Marcar como pago"
                              className="inline-flex items-center justify-center rounded-[8px] p-1.5 text-[#249689] hover:bg-[#249689]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {markingAsPaidId === inst.id ? (
                                <span className="block h-4 w-4 animate-spin rounded-full border-2 border-[#249689] border-t-transparent" />
                              ) : (
                                <MdCheck className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          {paid > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpandedInstallmentId(isExpanded ? null : inst.id)}
                              className="ml-2 font-medium text-zinc-600 hover:underline"
                            >
                              Histórico
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="bg-[#f1f4f8] px-3 py-3 align-top">
                            <PaymentHistory
                              installmentId={inst.id}
                              onRevert={async (paymentId) => { setPaymentToRevertId(paymentId) }}
                              onClose={() => setExpandedInstallmentId(null)}
                              reverting={submitting}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {payingInstallmentId && companyId && (
          <div className="rounded-[8px] border border-[#E0E3E7] bg-[#f1f4f8] p-4">
            <h3 className="mb-3 text-sm font-medium text-[#14181B]">Registrar pagamento</h3>
            <form onSubmit={handleSubmitPayment} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#14181B]">Valor (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={paymentForm.paid_amount}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, paid_amount: e.target.value }))}
                  className="w-full rounded-[8px] border border-[#E0E3E7] bg-white py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#14181B]">Data</label>
                <input
                  type="date"
                  value={paymentForm.paid_at}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, paid_at: e.target.value }))}
                  className="w-full rounded-[8px] border border-[#E0E3E7] bg-white py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#14181B]">Forma de pagamento</label>
                <select
                  value={paymentForm.payment_method_id}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, payment_method_id: Number(e.target.value) }))}
                  className="w-full rounded-[8px] border border-[#E0E3E7] bg-white py-2 px-3 text-sm"
                >
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#14181B]">Observação (opcional)</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-[8px] border border-[#E0E3E7] bg-white py-2 px-3 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Salvando...' : 'Registrar'}
                </Button>
                <Button type="button" variant="secondary" onClick={handleClosePaymentForm} disabled={submitting}>
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Modal>

    <ConfirmModal
      open={paymentToRevertId !== null}
      onClose={() => setPaymentToRevertId(null)}
      onConfirm={handleConfirmRevertPayment}
      title="Estornar pagamento"
      confirmLabel="Estornar"
      variant="danger"
      loading={submitting}
    >
      Estornar este pagamento? O valor será descontado da parcela e o registro de pagamento será revertido.
    </ConfirmModal>

    <ConfirmModal
      open={confirmQuitarOpen}
      onClose={() => setConfirmQuitarOpen(false)}
      onConfirm={handleConfirmQuitarContrato}
      title="Quitar contrato"
      confirmLabel="Quitar"
      variant="default"
      loading={submitting}
    >
      Quitar contrato? Serão marcadas {openCountQuitar} parcela(s) como pagas e o contrato será encerrado.
    </ConfirmModal>
    </>
  )
}

function PaymentHistory({
  installmentId,
  onRevert,
  onClose,
  reverting,
}: {
  installmentId: string
  onRevert: (paymentId: string) => Promise<void>
  onClose: () => void
  reverting: boolean
}) {
  const [payments, setPayments] = useState<Array<{ id: string; paid_amount: number; paid_at: string; payment_method_id: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getPaymentsByInstallment(installmentId).then((list) => {
      if (!cancelled) setPayments(list)
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [installmentId])

  return (
    <div className="rounded-[8px] border border-[#E0E3E7] bg-[#f1f4f8] p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#14181B]">Histórico de pagamentos</h3>
        <button type="button" onClick={onClose} className="text-sm text-[#1E3A8A] hover:underline">
          Fechar
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : payments.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhum pagamento registrado.</p>
      ) : (
        <ul className="space-y-2">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between text-sm">
              <span>
                {formatCurrency(p.paid_amount)} — {formatDate(p.paid_at)} — {PAYMENT_METHOD_LABELS[p.payment_method_id] ?? p.payment_method_id}
              </span>
              <button
                type="button"
                onClick={() => onRevert(p.id)}
                disabled={reverting}
                className="font-medium text-red-600 hover:underline disabled:opacity-50"
              >
                Estornar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
