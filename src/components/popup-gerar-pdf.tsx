'use client'

import { useState } from 'react'
import { Button, Modal } from '@/components/ui'
import { useCompanyId } from '@/hooks/use-company-id'
import { getContractById, getInstallmentsByContract } from '@/lib/supabase/contracts'
import { getCustomerById, getAddressById } from '@/lib/supabase/customers'
import { generateContractPdf } from '@/lib/pdf/contract-pdf'

export type PopupGerarPdfProps = {
  open: boolean
  onClose: () => void
  contractId?: string | null
}

export function PopupGerarPdf({ open, onClose, contractId }: PopupGerarPdfProps) {
  const { companyId } = useCompanyId()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGerar() {
    if (!contractId || !companyId) return

    setLoading(true)
    setError(null)

    try {
      const contract = await getContractById(contractId, companyId)
      if (!contract) {
        setError('Contrato não encontrado.')
        return
      }

      const customer = await getCustomerById(contract.customer_id)
      if (!customer) {
        setError('Cliente não encontrado.')
        return
      }

      const address = customer.address_id
        ? await getAddressById(customer.address_id)
        : null

      const installments = await getInstallmentsByContract(contractId)

      generateContractPdf({ contract, customer, address, installments })
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar PDF.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Gerar Confissão de Dívida"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Fechar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleGerar}
            disabled={loading || !contractId || !companyId}
          >
            {loading ? 'Gerando...' : 'Gerar PDF'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">
          Gerar o documento &quot;Instrumento Particular de Confissão de Dívida&quot; em PDF.
        </p>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    </Modal>
  )
}
