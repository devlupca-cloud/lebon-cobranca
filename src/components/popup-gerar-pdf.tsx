'use client'

import { Button, Modal } from '@/components/ui'

export type PopupGerarPdfProps = {
  open: boolean
  onClose: () => void
  /** ID do contrato para gerar o relatório (opcional) */
  contractId?: string | null
}

export function PopupGerarPdf({ open, onClose, contractId }: PopupGerarPdfProps) {
  function handleGerar() {
    // TODO: integrar com RPC/serviço de geração de PDF
    alert('Geração de PDF será integrada com o backend.')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Relatório de Contrato"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Fechar
          </Button>
          <Button type="button" variant="primary" onClick={handleGerar}>
            Gerar PDF
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">
          Gerar PDF completo do contrato.
          {contractId && (
            <span className="mt-1 block text-zinc-500">Contrato: {contractId}</span>
          )}
        </p>
        <p className="text-xs text-zinc-500">
          A integração com o serviço de geração de PDF será feita em seguida.
        </p>
      </div>
    </Modal>
  )
}
