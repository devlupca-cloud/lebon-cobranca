'use client'

import { Button, Modal } from '@/components/ui'

export type PopupQuitacaoProps = {
  open: boolean
  onClose: () => void
  /** ID do contrato/cliente para quitação (opcional) */
  contractId?: string | null
}

export function PopupQuitacao({ open, onClose, contractId }: PopupQuitacaoProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Quitação"
      footer={
        <Button type="button" variant="primary" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">
          Documento de quitação.
          {contractId && (
            <span className="mt-1 block text-zinc-500">Contrato: {contractId}</span>
          )}
        </p>
        <p className="text-xs text-zinc-500">
          O visualizador de PDF (ou link para o documento) será integrado aqui.
        </p>
      </div>
    </Modal>
  )
}
