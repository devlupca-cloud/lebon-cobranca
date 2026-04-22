'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Modal } from '@/components/ui'
import { useCompanyId } from '@/hooks/use-company-id'
import {
  getOpenInstallmentsByContract,
  type OverdueInstallmentRow,
} from '@/lib/supabase/installments'
import { formatCurrency } from '@/lib/simulacao'

export type PopupAcordoProps = {
  open: boolean
  onClose: () => void
  contractId: string | null
  contractNumber: string | null
  customerName: string
}

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDateBR(isoDate: string): string {
  const parts = isoDate.split('-')
  if (parts.length !== 3) return isoDate
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

export function PopupAcordo({
  open,
  onClose,
  contractId,
  contractNumber,
  customerName,
}: PopupAcordoProps) {
  const router = useRouter()
  const { companyId } = useCompanyId()
  const [installments, setInstallments] = useState<OverdueInstallmentRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadInstallments = useCallback(async () => {
    if (!contractId || !companyId) return
    setLoading(true)
    setError(null)
    try {
      const list = await getOpenInstallmentsByContract(contractId, companyId)
      setInstallments(list)
      // Pré-seleciona as que estão em atraso
      const preSelected = new Set(
        list.filter((i) => daysOverdue(i.due_date) > 0).map((i) => i.id)
      )
      setSelected(preSelected)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar parcelas.')
    } finally {
      setLoading(false)
    }
  }, [contractId, companyId])

  useEffect(() => {
    if (open && contractId && companyId) {
      loadInstallments()
    }
    if (!open) {
      setSelected(new Set())
      setError(null)
    }
  }, [open, contractId, companyId, loadInstallments])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === installments.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(installments.map((i) => i.id)))
    }
  }

  const totalSelected = useMemo(() => {
    return installments
      .filter((i) => selected.has(i.id))
      .reduce((sum, i) => sum + (i.amount - i.amount_paid), 0)
  }, [installments, selected])

  const selectedIds = useMemo(
    () => installments.filter((i) => selected.has(i.id)).map((i) => i.id),
    [installments, selected]
  )

  function handleContinuar() {
    if (!contractId || selectedIds.length === 0) return
    const params = new URLSearchParams()
    params.set('agreement', '1')
    params.set('contractId', contractId)
    params.set('installmentIds', selectedIds.join(','))
    params.set('valor', totalSelected.toFixed(2))
    router.push(`/simulacao?${params.toString()}`)
    onClose()
  }

  const allSelected = installments.length > 0 && selected.size === installments.length

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={`Acordo — ${customerName}`}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleContinuar}
            disabled={loading || selectedIds.length === 0}
          >
            {selectedIds.length === 0
              ? 'Selecione parcelas'
              : `Continuar com ${selectedIds.length} parcela${selectedIds.length > 1 ? 's' : ''} (${formatCurrency(totalSelected)})`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">
          Contrato <strong>{contractNumber ?? '—'}</strong>. Selecione as parcelas que
          entrarão no acordo. Clique em uma linha para marcar/desmarcar.
        </p>

        {error && (
          <div className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1E3A8A] border-t-transparent" />
          </div>
        ) : installments.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">
            Nenhuma parcela em aberto neste contrato.
          </p>
        ) : (
          <div className="overflow-hidden rounded-[8px] border border-[#e5e7eb]">
            <table className="w-full text-sm">
              <thead className="bg-[#f8fafc] text-xs uppercase text-[#536471]">
                <tr>
                  <th className="w-10 px-3 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Selecionar todas"
                    />
                  </th>
                  <th className="px-3 py-2 text-left">Parcela</th>
                  <th className="px-3 py-2 text-left">Vencimento</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2 text-right">Pago</th>
                  <th className="px-3 py-2 text-right">Saldo</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {installments.map((inst) => {
                  const isSelected = selected.has(inst.id)
                  const days = daysOverdue(inst.due_date)
                  const balance = inst.amount - inst.amount_paid
                  return (
                    <tr
                      key={inst.id}
                      onClick={() => toggle(inst.id)}
                      className={
                        'cursor-pointer border-t border-[#e5e7eb] transition-colors ' +
                        (isSelected ? 'bg-blue-50' : 'hover:bg-zinc-50')
                      }
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(inst.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Selecionar parcela ${inst.installment_number}`}
                        />
                      </td>
                      <td className="px-3 py-2">{inst.installment_number}</td>
                      <td className="px-3 py-2">{formatDateBR(inst.due_date)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(inst.amount)}</td>
                      <td className="px-3 py-2 text-right text-[#536471]">
                        {formatCurrency(inst.amount_paid)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCurrency(balance)}
                      </td>
                      <td className="px-3 py-2">
                        {days > 0 ? (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                            {days} dias atraso
                          </span>
                        ) : days === 0 ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Vence hoje
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                            A vencer
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  )
}
