'use client'

import { ContratoForm, contractToFormState } from '@/components/contrato-form'
import type { ContractFormState } from '@/components/contrato-form'
import { useHeader } from '@/contexts/header-context'
import { getContractById } from '@/lib/supabase/contracts'
import { getCustomerById } from '@/lib/supabase/customers'
import type { CustomerAutocompleteItem } from '@/lib/supabase/customers'
import { useCompanyId } from '@/hooks/use-company-id'
import { CONTRACT_STATUS } from '@/types/enums'
import { LoadingScreen } from '@/components/ui'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

/** Financial fields that should be disabled when contract is active (parcelas já geradas). */
const ACTIVE_DISABLED_FIELDS = new Set([
  'contract_amount',
  'installments_count',
  'first_due_date',
  'admin_fee_rate',
  'interest_rate',
  'valor_financiado',
  'valor_titulo',
  'tipo',
  'financiamento_sub',
  'status_id',
  'customer_id',
])

function customerToAutocompleteItem(c: {
  id: string
  full_name: string | null
  legal_name?: string | null
  trade_name?: string | null
  cpf: string | null
  cnpj: string | null
  person_type?: string
}): CustomerAutocompleteItem {
  const isPJ = c.person_type === 'juridica'
  // Nome para exibição: PJ usa razão/nome fantasia; PF usa full_name. Sempre tenta qualquer campo preenchido.
  const label =
    (isPJ ? (c.legal_name ?? c.trade_name ?? c.full_name) : (c.full_name ?? c.legal_name ?? c.trade_name)) ??
    ''
  return {
    id: c.id,
    label: (typeof label === 'string' ? label.trim() : '') || '—',
    person_type: c.person_type ?? (c.cnpj ? 'juridica' : 'fisica'),
    full_name: c.full_name ?? null,
    legal_name: c.trade_name ?? c.legal_name ?? null,
    trade_name: c.trade_name ?? null,
    cpf: c.cpf ?? null,
    cnpj: c.cnpj ?? null,
  }
}

export default function EditarContratoPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : null
  const { setTitle, setBreadcrumb } = useHeader()
  const { companyId, loading: companyLoading } = useCompanyId()

  const [initialData, setInitialData] = useState<ContractFormState | null>(null)

  useEffect(() => {
    setTitle('Editar Contrato')
    setBreadcrumb([
      { label: 'Home', href: '/home' },
      { label: 'Contratos', href: '/contratos' },
      { label: 'Editar' },
    ])
    return () => {
      setTitle('')
      setBreadcrumb([])
    }
  }, [setTitle, setBreadcrumb])
  const [initialCustomer, setInitialCustomer] = useState<CustomerAutocompleteItem | null>(null)
  const [initialGuarantor, setInitialGuarantor] = useState<CustomerAutocompleteItem | null>(null)
  const [disabledFields, setDisabledFields] = useState<Set<string> | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id || !companyId) return
    let cancelled = false
    setLoading(true)
    setNotFound(false)

    async function load() {
      try {
        const contract = await getContractById(id!, companyId!)
        if (cancelled) return
        if (!contract) {
          setNotFound(true)
          return
        }

        // Redirect to details page if contract is closed/canceled (read-only)
        if (
          contract.status_id === CONTRACT_STATUS.CLOSED ||
          contract.status_id === CONTRACT_STATUS.CANCELED
        ) {
          router.replace(`/detalhes-contrato/${id}`)
          return
        }

        // Set disabled fields based on status
        if (contract.status_id === CONTRACT_STATUS.ACTIVE) {
          setDisabledFields(ACTIVE_DISABLED_FIELDS)
        }

        // Convert contract to form state
        setInitialData(contractToFormState(contract))

        // Build customer autocomplete item from contract.customer (considera PF/PJ)
        if (contract.customer) {
          const cust = contract.customer
          setInitialCustomer(customerToAutocompleteItem({
            id: cust.id,
            full_name: cust.full_name ?? '',
            legal_name: cust.legal_name ?? undefined,
            trade_name: cust.trade_name ?? undefined,
            cpf: cust.cpf,
            cnpj: cust.cnpj,
            person_type: cust.person_type ?? (cust.cnpj ? 'juridica' : 'fisica'),
          }))
        }

        // Load guarantor if present (considera PF/PJ)
        if (contract.guarantor_customer_id) {
          const guarantor = await getCustomerById(contract.guarantor_customer_id)
          if (!cancelled && guarantor) {
            setInitialGuarantor(customerToAutocompleteItem({
              id: guarantor.id,
              full_name: guarantor.full_name,
              legal_name: guarantor.legal_name,
              trade_name: guarantor.trade_name,
              cpf: guarantor.cpf,
              cnpj: guarantor.cnpj,
              person_type: guarantor.person_type,
            }))
          }
        }
      } catch {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [id, companyId, router])

  if (companyLoading || loading) return <LoadingScreen message="Carregando contrato..." />

  if (notFound || !id) {
    return (
      <div className="p-6">
        <p className="text-amber-600">Contrato não encontrado.</p>
        <Link href="/contratos" className="mt-4 inline-block text-[#1E3A8A] hover:underline">
          Voltar para Contratos
        </Link>
      </div>
    )
  }

  return (
    <ContratoForm
      mode="edit"
      contractId={id}
      companyId={companyId ?? undefined}
      initialData={initialData ?? undefined}
      initialCustomer={initialCustomer}
      initialGuarantor={initialGuarantor}
      disabledFields={disabledFields}
    />
  )
}
