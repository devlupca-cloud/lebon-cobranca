'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { buttonPrimary, buttonSecondary } from '@/lib/design'

export interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  /** Mensagem ou conteúdo do corpo do modal */
  children: React.ReactNode
  /** Texto do botão de confirmação (ex.: "Excluir", "Remover") */
  confirmLabel?: string
  /** Texto do botão de cancelar */
  cancelLabel?: string
  /** Variante visual: danger = botão vermelho (exclusão), default = primário */
  variant?: 'danger' | 'default'
  /** Enquanto true, desabilita botões e pode mostrar loading */
  loading?: boolean
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  loading = false,
}: ConfirmModalProps) {
  const overlayRef = React.useRef<HTMLDivElement>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const isBusy = loading || submitting

  React.useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isBusy) onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose, isBusy])

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current && !isBusy) onClose()
  }

  async function handleConfirm() {
    if (isBusy) return
    setSubmitting(true)
    try {
      await Promise.resolve(onConfirm())
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const confirmButtonClass =
    variant === 'danger'
      ? 'rounded-[8px] px-4 py-2.5 text-sm font-medium text-white bg-[#ff5963] hover:bg-[#ee4a5a] focus:ring-2 focus:ring-[#ff5963]/30 disabled:opacity-50'
      : buttonPrimary

  const content = (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleOverlayClick}
    >
      <div
        className="w-full max-w-[400px] overflow-hidden rounded-[8px] border border-[#E0E3E7] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[#E0E3E7] px-4 py-3">
          <h2 id="confirm-modal-title" className="text-lg font-semibold text-[#14181B]">
            {title}
          </h2>
        </div>
        <div className="px-4 py-4 text-sm text-[#57636C]">{children}</div>
        <div className="flex justify-end gap-2 border-t border-[#E0E3E7] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className={buttonSecondary}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isBusy}
            className={confirmButtonClass}
          >
            {isBusy ? 'Aguarde...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null
}
