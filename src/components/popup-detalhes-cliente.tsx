'use client'

import { Modal } from '@/components/ui'
import type { Customer } from '@/types/database'

type PopupDetalhesClienteProps = {
  open: boolean
  onClose: () => void
  customer: Customer | null
}

function formatCpfCnpj(value: string | null): string {
  if (!value) return '—'
  const digits = value.replace(/\D/g, '')
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return value
}

export function PopupDetalhesCliente({
  open,
  onClose,
  customer,
}: PopupDetalhesClienteProps) {
  if (!customer) return null

  const displayName =
    customer.full_name ?? customer.legal_name ?? customer.trade_name ?? '—'
  const doc = customer.person_type === 'pf' ? customer.cpf : customer.cnpj
  const phone = customer.mobile ?? customer.phone ?? '—'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalhes do cliente"
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase text-zinc-500">Nome</p>
          <p className="text-zinc-900">{displayName}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-zinc-500">
            {customer.person_type === 'pf' ? 'CPF' : 'CNPJ'}
          </p>
          <p className="text-zinc-900">{formatCpfCnpj(doc)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-zinc-500">E-mail</p>
          <p className="text-zinc-900">{customer.email ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-zinc-500">Telefone / Celular</p>
          <p className="text-zinc-900">{phone}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-zinc-500">Código do cliente</p>
          <p className="text-zinc-900">{customer.customer_code ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-zinc-500">Indicação</p>
          <p className="text-zinc-900">{customer.referral ?? '—'}</p>
        </div>
      </div>
    </Modal>
  )
}
