'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui'
import { formatCPFOrCNPJ, formatPhone } from '@/lib/format'
import { buttonPrimary, card, pillType } from '@/lib/design'
import { getCustomerById, getAddressById, type AddressRow } from '@/lib/supabase/customers'
import type { Customer, CustomerFromAPI } from '@/types/database'

type PopupDetalhesClienteProps = {
  open: boolean
  onClose: () => void
  customer: CustomerFromAPI | null
}

/**
 * Merge dos dados da listagem (CustomerFromAPI) com os dados completos
 * vindos do banco via getCustomerById. Garante que os campos adicionados
 * depois da RPC get_customers (rg, birthplace, system_code) apareçam
 * sempre, e que saldo devedor fique fresco.
 */
type HydratedCustomer = CustomerFromAPI & Partial<Customer>

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
  const [hydrated, setHydrated] = useState<HydratedCustomer | null>(customer)
  const [hydratedAddress, setHydratedAddress] = useState<AddressRow | null>(null)

  useEffect(() => {
    setHydrated(customer)
    setHydratedAddress(null)
    if (!open || !customer?.id) return
    let cancelled = false
    getCustomerById(customer.id, customer.company_id)
      .then(async (full) => {
        if (cancelled || !full) return
        setHydrated({ ...customer, ...full })
        if (full.address_id) {
          const addr = await getAddressById(full.address_id, customer.company_id)
          if (!cancelled) setHydratedAddress(addr)
        }
      })
      .catch(() => {
        // mantém os dados da listagem se o fetch completo falhar
      })
    return () => {
      cancelled = true
    }
  }, [open, customer])

  if (!hydrated) return null

  const isPJ = hydrated.person_type === 'juridica'
  const phone = formatPhone(hydrated.mobile ?? hydrated.phone)
  const address = hydratedAddress
    ? {
        street: hydratedAddress.street,
        number: hydratedAddress.number,
        neighbourhood: hydratedAddress.neighbourhood,
        city: hydratedAddress.city,
        state: hydratedAddress.state,
        zip_code: hydratedAddress.zip_code,
      }
    : hydrated.address
  const addressParts = [
    address?.street,
    address?.number,
    address?.neighbourhood,
    address?.city,
    address?.state,
  ].filter(Boolean)
  const addressLine =
    addressParts.length > 0
      ? `${addressParts.join(', ')}${address?.zip_code ? ` · CEP ${address.zip_code}` : ''}`
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
                <Field label="Razão social" value={hydrated.legal_name} />
                <Field label="Nome fantasia" value={hydrated.trade_name} />
                <Field label="CNPJ" value={formatCPFOrCNPJ(null, hydrated.cnpj)} />
                <Field label="Inscrição estadual" value={hydrated.state_registration} />
              </>
            ) : (
              <>
                <Field label="Nome completo" value={hydrated.full_name} />
                <Field label="CPF" value={formatCPFOrCNPJ(hydrated.cpf, null)} />
                <Field label="RG" value={hydrated.rg} />
                <Field label="Data de nascimento" value={formatDate(hydrated.birth_date)} />
                <Field label="Naturalidade" value={hydrated.birthplace} />
                <Field label="Ocupação" value={hydrated.occupation} />
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
            <Field label="E-mail" value={hydrated.email} />
            <Field label="Telefone / Celular" value={phone} />
            <Field label="Código do cliente" value={hydrated.customer_code} />
            <Field label="Código do sistema" value={hydrated.system_code} />
            <Field label="Indicação" value={hydrated.referral} />
            <Field label="Status" value={hydrated.status?.name} />
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
          {(() => {
            const limit = hydrated.credit_limit ?? 0
            const debt = hydrated.outstanding_balance ?? 0
            const available = Math.max(0, limit - debt)
            return (
              <dl className="grid gap-3 sm:grid-cols-3">
                <Field
                  label="Limite de crédito"
                  value={formatCurrency(hydrated.credit_limit)}
                />
                <Field
                  label="Saldo devedor"
                  value={debt > 0 ? `− ${formatCurrency(debt)}` : formatCurrency(0)}
                  tone={debt > 0 ? 'danger' : 'default'}
                />
                <Field
                  label="Limite disponível"
                  value={formatCurrency(available)}
                  tone="success"
                  hint={
                    limit > 0
                      ? `${Math.round((available / limit) * 100)}% do limite livre`
                      : undefined
                  }
                />
              </dl>
            )
          })()}
        </section>
      </div>
    </Modal>
  )
}

function Field({
  label,
  value,
  tone = 'default',
  hint,
}: {
  label: string
  value: string | null | undefined
  tone?: 'default' | 'danger' | 'success'
  hint?: string
}) {
  const toneClass =
    tone === 'danger'
      ? 'text-[#ff5963]'
      : tone === 'success'
        ? 'text-[#249689]'
        : 'text-[#14181B]'
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-[#57636C]">{label}</dt>
      <dd className={'mt-1 text-sm font-semibold ' + toneClass}>{value || '—'}</dd>
      {hint && <p className="mt-0.5 text-xs text-[#57636C]">{hint}</p>}
    </div>
  )
}
