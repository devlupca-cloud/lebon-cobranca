'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  /** Conteúdo do rodapé (ex.: botões) */
  footer?: React.ReactNode
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const overlayRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  if (!open) return null

  const content = (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleOverlayClick}
    >
      <div
        className="max-h-[90vh] w-full max-w-[600px] overflow-hidden rounded-[8px] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 id="modal-title" className="text-lg font-semibold text-zinc-900">
              {title}
            </h2>
          </div>
        )}
        <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
          {children}
        </div>
        {footer && (
          <div className="border-t border-zinc-200 px-4 py-3 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null
}
