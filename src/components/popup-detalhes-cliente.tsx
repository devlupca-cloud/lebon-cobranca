'use client'

import { Modal } from '@/components/ui'
import { formatCPFOrCNPJ, formatPhone } from '@/lib/format'
import { buttonPrimary, card, pillType } from '@/lib/design'
import type { CustomerFromAPI } from '@/types/database'

type PopupDetalhesClienteProps = {
  open: boolean
  onClose: () => void
  customer: CustomerFromAPI | null
}

function formatCurrency(value: number | null | undefined): string | null {
  if (value == null) return null
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null
  return new Date(value).toLocaleDateString('pt-BR')
}

export function PopupDetalhesCliente({
  open,
  onClose,
  customer,
}: PopupDetalhesClienteProps) {
  if (!customer) return null

  const isPJ = customer.person_type === 'juridica'
  const phone = formatPhone(customer.mobile ?? customer.phone)
  const addressParts = [
    customer.address?.street,
    customer.address?.number,
    customer.address?.neighbourhood,
    customer.address?.city,
    customer.address?.state,
  ].filter(Boolean)
  const addressLine =
    addressParts.length > 0
      ? `${addressParts.join(', ')}${customer.address?.zip_code ? ` · CEP ${customer.address.zip_code}` : ''}`
      : null

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
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <span className={pillType}>{isPJ ? 'PJ' : 'PF'}</span>
        </div>

        {/* Dados pessoais (PF) ou Dados da empresa (PJ) */}
        <section className={card + ' p-4'}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#57636C]">
            {isPJ ? 'Dados da empresa' : 'Dados pessoais'}
          </h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            {isPJ ? (
              <>
                <Field label="Razão social" value={customer.legal_name} />
                <Field label="Nome fantasia" value={customer.trade_name} />
                <Field label="CNPJ" value={formatCPFOrCNPJ(null, customer.cnpj)} />
                <Field label="Inscrição estadual" value={customer.state_registration} />
              </>
            ) : (
              <>
                <Field label="Nome completo" value={customer.full_name} />
                <Field label="CPF" value={formatCPFOrCNPJ(customer.cpf, null)} />
                <Field label="Data de nascimento" value={formatDate(customer.birth_date)} />
                <Field label="Ocupação" value={customer.occupation} />
              </>
            )}
          </dl>
        </section>

        {/* Contato e cadastro */}
        <section className={card + ' p-4'}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#57636C]">
            Contato e cadastro
          </h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="E-mail" value={customer.email} />
            <Field label="Telefone / Celular" value={phone} />
            <Field label="Código do cliente" value={customer.customer_code} />
            <Field label="Indicação" value={customer.referral} />
            <Field label="Status" value={customer.status?.name} />
          </dl>
        </section>

        {/* Endereço */}
        {addressLine && (
          <section className={card + ' p-4'}>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#57636C]">
              Endereço
            </h3>
            <p className="text-sm text-[#14181B]">{addressLine}</p>
          </section>
        )}

        {/* Financeiro */}
        <section className={card + ' p-4'}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#57636C]">
            Financeiro
          </h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Limite de crédito" value={formatCurrency(customer.credit_limit)} />
            <Field label="Saldo devedor" value={formatCurrency(customer.outstanding_balance)} />
          </dl>
        </section>
      </div>
    </Modal>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-[#57636C]">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-[#14181B]">{value || '—'}</dd>
    </div>
  )
}
