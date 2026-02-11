'use client'

import { Modal } from '@/components/ui'
import { formatCPFOrCNPJ } from '@/lib/format'
import { buttonPrimary } from '@/lib/design'
import type { CustomerFromAPI } from '@/types/database'

type PopupDetalhesClienteProps = {
  open: boolean
  onClose: () => void
  customer: CustomerFromAPI | null
}

export function PopupDetalhesCliente({
  open,
  onClose,
  customer,
}: PopupDetalhesClienteProps) {
  if (!customer) return null

  const displayName =
    customer.full_name ?? customer.legal_name ?? customer.trade_name ?? '—'
  const isPJ = customer.person_type === 'juridica'
  const phone = customer.mobile ?? customer.phone ?? '—'
  const addressParts = [
    customer.address?.street,
    customer.address?.number,
    customer.address?.neighbourhood,
    customer.address?.city,
    customer.address?.state,
  ].filter(Boolean)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalhes do cliente"
      footer={
        <button type="button" onClick={onClose} className={buttonPrimary}>
          Fechar
        </button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome" value={displayName} />
          <Field label={isPJ ? 'CNPJ' : 'CPF'} value={formatCPFOrCNPJ(customer.cpf, customer.cnpj)} />
          <Field label="E-mail" value={customer.email} />
          <Field label="Telefone / Celular" value={phone} />
          <Field label="Código do cliente" value={customer.customer_code} />
          <Field label="Indicação" value={customer.referral} />
          <Field label="Status" value={customer.status?.name} />
          {isPJ && <Field label="Razão social" value={customer.legal_name} />}
          {!isPJ && (
            <Field
              label="Data de nascimento"
              value={customer.birth_date ? new Date(customer.birth_date).toLocaleDateString('pt-BR') : null}
            />
          )}
        </div>

        {addressParts.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase text-[#536471]">Endereço</p>
            <p className="mt-1 text-sm text-[#0f1419]">
              {addressParts.join(', ')}
              {customer.address?.zip_code ? ` · CEP ${customer.address.zip_code}` : ''}
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Limite de crédito"
            value={
              customer.credit_limit != null
                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(customer.credit_limit)
                : null
            }
          />
          <Field
            label="Saldo devedor"
            value={
              customer.outstanding_balance != null
                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(customer.outstanding_balance)
                : null
            }
          />
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-[#536471]">{label}</p>
      <p className="mt-1 text-sm text-[#0f1419]">{value || '—'}</p>
    </div>
  )
}
