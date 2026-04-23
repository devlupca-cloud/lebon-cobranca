'use client'

import { useState } from 'react'
import { Button, Modal } from '@/components/ui'
import { useCompanyId } from '@/hooks/use-company-id'
import { getContractById, getInstallmentsByContract } from '@/lib/supabase/contracts'
import { getCustomerById, getAddressById } from '@/lib/supabase/customers'
import { generateContractPdf } from '@/lib/pdf/contract-pdf'
import { generateQuitacaoPdf } from '@/lib/pdf/quitacao-pdf'
import { generateAcordoPdf } from '@/lib/pdf/acordo-pdf'
import { INSTALLMENT_ORIGIN, INSTALLMENT_STATUS } from '@/types/enums'

function customerDisplayName(c: {
  full_name?: string | null
  legal_name?: string | null
  trade_name?: string | null
}): string {
  return c.full_name || c.legal_name || c.trade_name || '—'
}

export type PopupGerarPdfType = 'confissao' | 'quitacao' | 'acordo'

export type PopupGerarPdfProps = {
  open: boolean
  onClose: () => void
  contractId?: string | null
  /** Tipo de documento. Padrão: 'confissao' (mantém comportamento antigo). */
  type?: PopupGerarPdfType
}

const COPY: Record<PopupGerarPdfType, { title: string; description: string; cta: string }> = {
  confissao: {
    title: 'Gerar Confissão de Dívida',
    description: 'Gerar o documento "Instrumento Particular de Confissão de Dívida" em PDF.',
    cta: 'Gerar PDF',
  },
  quitacao: {
    title: 'Gerar Termo de Quitação',
    description: 'Gerar o documento "Termo de Quitação de Dívida" em PDF.',
    cta: 'Gerar Quitação',
  },
  acordo: {
    title: 'Gerar Contrato de Acordo',
    description: 'Gerar o documento "Instrumento Particular de Acordo de Renegociação" em PDF.',
    cta: 'Gerar Acordo',
  },
}

export function PopupGerarPdf({ open, onClose, contractId, type = 'confissao' }: PopupGerarPdfProps) {
  const { companyId } = useCompanyId()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const copy = COPY[type]

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

      if (type === 'quitacao') {
        generateQuitacaoPdf({ contract, customerName: customerDisplayName(customer) })
        onClose()
        return
      }

      const address = customer.address_id
        ? await getAddressById(customer.address_id)
        : null
      const installments = await getInstallmentsByContract(contractId)

      if (type === 'acordo') {
        const agreementInstallments = installments.filter(
          (i) =>
            i.origin_id === INSTALLMENT_ORIGIN.RENEGOTIATION &&
            i.status_id !== INSTALLMENT_STATUS.CANCELED
        )
        if (agreementInstallments.length === 0) {
          setError('Nenhuma parcela de acordo encontrada para este contrato.')
          return
        }
        const outstandingBalance = agreementInstallments.reduce(
          (sum, i) => sum + (Number(i.amount) - Number(i.amount_paid ?? 0)),
          0
        )
        generateAcordoPdf({ contract, customer, address, agreementInstallments, outstandingBalance })
        onClose()
        return
      }

      // confissao (padrão) — usa contract-pdf
      await generateContractPdf({ contract, customer, address, installments })
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
      title={copy.title}
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
            {loading ? 'Gerando...' : copy.cta}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">{copy.description}</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  )
}
