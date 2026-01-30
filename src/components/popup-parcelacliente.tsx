'use client'

import { Modal } from '@/components/ui'
import { getContractsByCustomer, getInstallmentsByContract } from '@/lib/supabase/contracts'
import type { Contract, Customer } from '@/types/database'
import type { ContractInstallment } from '@/types/database'
import { useCallback, useEffect, useState } from 'react'

export type PopupParcelaclienteProps = {
  open: boolean
  onClose: () => void
  customer?: Customer | null
  contractId?: string | null
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

function statusLabel(statusId: number): string {
  // 1=pago, 2=pendente, etc. - ajuste conforme sua tabela installment_statuses
  const map: Record<number, string> = {
    1: 'Pago',
    2: 'Pendente',
    3: 'Vencido',
  }
  return map[statusId] ?? `Status ${statusId}`
}

export function PopupParcelacliente({
  open,
  onClose,
  customer,
  contractId: initialContractId,
}: PopupParcelaclienteProps) {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [selectedContractId, setSelectedContractId] = useState<string | null>(
    initialContractId ?? null
  )
  const [installments, setInstallments] = useState<ContractInstallment[]>([])
  const [loadingContracts, setLoadingContracts] = useState(false)
  const [loadingInstallments, setLoadingInstallments] = useState(false)

  const displayName =
    customer?.full_name ?? customer?.legal_name ?? customer?.trade_name ?? '—'

  const fetchContracts = useCallback(async () => {
    if (!customer?.id || !customer?.company_id) return
    setLoadingContracts(true)
    try {
      const list = await getContractsByCustomer(customer.company_id, customer.id)
      setContracts(list)
      if (list.length > 0 && !selectedContractId) {
        setSelectedContractId(list[0].id)
      }
    } finally {
      setLoadingContracts(false)
    }
  }, [customer?.id, customer?.company_id])

  const fetchInstallments = useCallback(async (contractId: string) => {
    setLoadingInstallments(true)
    try {
      const list = await getInstallmentsByContract(contractId)
      setInstallments(list)
    } finally {
      setLoadingInstallments(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    if (initialContractId) {
      setSelectedContractId(initialContractId)
      fetchInstallments(initialContractId)
      setContracts([])
      return
    }
    if (customer?.id && customer?.company_id) {
      setSelectedContractId(null)
      setInstallments([])
      fetchContracts()
    } else {
      setContracts([])
      setInstallments([])
      setSelectedContractId(null)
    }
  }, [open, initialContractId, customer?.id, customer?.company_id, fetchContracts, fetchInstallments])

  useEffect(() => {
    if (open && selectedContractId && !initialContractId) {
      fetchInstallments(selectedContractId)
    }
  }, [open, selectedContractId, initialContractId, fetchInstallments])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Parcelas do Cliente"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded bg-[#1E3A8A] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af]"
        >
          Fechar
        </button>
      }
    >
      <div className="space-y-4">
        {customer && (
          <p className="text-sm text-zinc-600">
            Cliente: <strong>{displayName}</strong>
          </p>
        )}
        {customer && contracts.length > 1 && (
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-zinc-500">
              Contrato
            </label>
            <select
              value={selectedContractId ?? ''}
              onChange={(e) => setSelectedContractId(e.target.value || null)}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
            >
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.contract_number ?? c.id.slice(0, 8)} — {formatCurrency(c.contract_amount ?? 0)}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="rounded border border-zinc-200">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-zinc-500">
                  Parcela
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-zinc-500">
                  Vencimento
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase text-zinc-500">
                  Valor
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase text-zinc-500">
                  Pago
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-zinc-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white">
              {loadingInstallments ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                    Carregando parcelas...
                  </td>
                </tr>
              ) : installments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                    Nenhuma parcela encontrada para este contrato.
                  </td>
                </tr>
              ) : (
                installments.map((i) => (
                  <tr key={i.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 text-zinc-900">{i.installment_number}</td>
                    <td className="px-3 py-2 text-zinc-600">{formatDate(i.due_date)}</td>
                    <td className="px-3 py-2 text-right text-zinc-600">
                      {formatCurrency(i.amount)}
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-600">
                      {formatCurrency(i.amount_paid)}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">
                      {statusLabel(i.status_id)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  )
}
