'use client'

import { Button, ConfirmModal, Modal } from '@/components/ui'
import { deletePayment, getPaymentsByInstallment } from '@/lib/supabase/payments'
import type { ContractInstallment, InstallmentPayment } from '@/types/database'
import { INSTALLMENT_STATUS, PAYMENT_METHOD } from '@/types/enums'
import { useCallback, useEffect, useState } from 'react'
import { MdDownload, MdUndo } from 'react-icons/md'
import { generateReciboPdf } from '@/lib/pdf/recibo-pdf'
import { getContractById } from '@/lib/supabase/contracts'
import { getCustomerById } from '@/lib/supabase/customers'

export type PopupHistoricoPagamentoProps = {
  open: boolean
  onClose: () => void
  /** Parcela cujos pagamentos serão listados. */
  installment: ContractInstallment | null
  companyId: string | null | undefined
  /** Callback para refrescar dados externos após estornar. */
  onChange?: () => void | Promise<void>
}

const PAYMENT_METHOD_LABELS: Record<number, string> = {
  [PAYMENT_METHOD.CASH]: 'Dinheiro',
  [PAYMENT_METHOD.PIX]: 'PIX',
  [PAYMENT_METHOD.BANK_TRANSFER]: 'Transferência',
  [PAYMENT_METHOD.CARD]: 'Cartão',
  [PAYMENT_METHOD.BOLETO]: 'Boleto',
}

const STATUS_LABELS: Record<number, string> = {
  [INSTALLMENT_STATUS.OPEN]: 'Em aberto',
  [INSTALLMENT_STATUS.PARTIAL]: 'Parcial',
  [INSTALLMENT_STATUS.PAID]: 'Quitada',
  [INSTALLMENT_STATUS.OVERDUE]: 'Vencida',
  [INSTALLMENT_STATUS.CANCELED]: 'Cancelada',
  [INSTALLMENT_STATUS.RENEGOTIATED]: 'Renegociada',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const d = new Date(value.includes('T') ? value : `${value}T12:00:00`)
  if (isNaN(d.getTime())) return value
  return d.toLocaleDateString('pt-BR')
}

export function PopupHistoricoPagamento({
  open,
  onClose,
  installment,
  companyId,
  onChange,
}: PopupHistoricoPagamentoProps) {
  const [payments, setPayments] = useState<InstallmentPayment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reverting, setReverting] = useState(false)
  const [paymentToRevertId, setPaymentToRevertId] = useState<string | null>(null)
  const [generatingReciboId, setGeneratingReciboId] = useState<string | null>(null)

  const fetchPayments = useCallback(async () => {
    if (!installment) return
    setLoading(true)
    setError(null)
    try {
      const list = await getPaymentsByInstallment(installment.id)
      setPayments(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar pagamentos.')
    } finally {
      setLoading(false)
    }
  }, [installment])

  useEffect(() => {
    if (open && installment) fetchPayments()
  }, [open, installment, fetchPayments])

  if (!installment) return null

  const amount = Number(installment.amount)
  const paid = Number(installment.amount_paid ?? 0)
  const openAmount = amount - paid
  const statusLabel = STATUS_LABELS[installment.status_id] ?? '—'

  async function handleConfirmRevert() {
    if (!paymentToRevertId || !companyId) return
    setReverting(true)
    setError(null)
    try {
      await deletePayment(paymentToRevertId, companyId)
      setPaymentToRevertId(null)
      await fetchPayments()
      await onChange?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao estornar pagamento.')
    } finally {
      setReverting(false)
    }
  }

  async function handleBaixarRecibo(payment: InstallmentPayment) {
    if (!installment || !companyId) return
    setGeneratingReciboId(payment.id)
    setError(null)
    try {
      const contract = await getContractById(installment.contract_id, companyId)
      if (!contract) throw new Error('Contrato não encontrado.')
      const customer = await getCustomerById(contract.customer_id)
      if (!customer) throw new Error('Cliente não encontrado.')
      generateReciboPdf({
        contract,
        customer,
        installment,
        payment,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar recibo.')
    } finally {
      setGeneratingReciboId(null)
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={reverting ? () => {} : onClose}
        title={`Parcela ${installment.installment_number} · Histórico de pagamentos`}
        size="lg"
        footer={
          <Button type="button" variant="primary" onClick={onClose} disabled={reverting}>
            Fechar
          </Button>
        }
      >
        <div className="space-y-4">
          {/* Resumo da parcela */}
          <div className="grid grid-cols-2 gap-3 rounded-[8px] bg-[#f1f4f8] p-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-[#57636C]">Vencimento</p>
              <p className="font-medium text-[#14181B]">{formatDate(installment.due_date)}</p>
            </div>
            <div>
              <p className="text-xs text-[#57636C]">Valor</p>
              <p className="font-medium text-[#14181B]">{formatCurrency(amount)}</p>
            </div>
            <div>
              <p className="text-xs text-[#57636C]">Pago</p>
              <p className="font-medium text-[#249689]">{formatCurrency(paid)}</p>
            </div>
            <div>
              <p className="text-xs text-[#57636C]">Saldo</p>
              <p className={`font-medium ${openAmount > 0 ? 'text-red-600' : 'text-[#249689]'}`}>
                {formatCurrency(openAmount)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#57636C]">
            <span>Status:</span>
            <span className="rounded-[8px] bg-white px-2 py-0.5 font-medium text-[#14181B] border border-[#E0E3E7]">
              {statusLabel}
            </span>
          </div>

          {error && (
            <div className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Lista de pagamentos */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E3A8A] border-t-transparent" />
            </div>
          ) : payments.length === 0 ? (
            <p className="text-sm text-[#57636C]">Nenhum pagamento registrado nesta parcela.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-zinc-500">Data</th>
                    <th className="px-3 py-2 text-right font-medium text-zinc-500">Valor</th>
                    <th className="px-3 py-2 text-left font-medium text-zinc-500">Método</th>
                    <th className="px-3 py-2 text-left font-medium text-zinc-500">Observação</th>
                    <th className="px-3 py-2 text-right font-medium text-zinc-500">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50">
                      <td className="px-3 py-2 text-zinc-900">{formatDate(p.paid_at)}</td>
                      <td className="px-3 py-2 text-right font-medium text-zinc-900">
                        {formatCurrency(Number(p.paid_amount))}
                      </td>
                      <td className="px-3 py-2 text-zinc-600">
                        {PAYMENT_METHOD_LABELS[p.payment_method_id] ?? p.payment_method_id}
                      </td>
                      <td className="px-3 py-2 text-zinc-600">{p.notes ?? '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleBaixarRecibo(p)}
                            disabled={generatingReciboId !== null}
                            aria-label="Baixar recibo"
                            title="Baixar recibo"
                            className="inline-flex items-center gap-1 rounded-[8px] border border-[#E0E3E7] bg-white px-2 py-1 text-xs font-medium text-[#1E3A8A] hover:bg-[#f1f4f8] disabled:opacity-50"
                          >
                            <MdDownload className="h-4 w-4" />
                            {generatingReciboId === p.id ? 'Gerando...' : 'Recibo'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentToRevertId(p.id)}
                            disabled={reverting || !companyId}
                            aria-label="Estornar pagamento"
                            title="Estornar pagamento"
                            className="inline-flex items-center gap-1 rounded-[8px] border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            <MdUndo className="h-4 w-4" />
                            Estornar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={paymentToRevertId !== null}
        onClose={() => setPaymentToRevertId(null)}
        onConfirm={handleConfirmRevert}
        title="Estornar pagamento"
        confirmLabel="Estornar"
        variant="danger"
        loading={reverting}
      >
        Estornar este pagamento? O valor será desfeito e a parcela volta a ficar em aberto. Esta ação
        não pode ser desfeita automaticamente.
      </ConfirmModal>
    </>
  )
}
