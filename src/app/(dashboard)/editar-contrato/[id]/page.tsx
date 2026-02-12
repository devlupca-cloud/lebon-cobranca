'use client'

import { ContratoForm, contractToFormState } from '@/components/contrato-form'
import type { ContractFormState } from '@/components/contrato-form'
import { getContractById } from '@/lib/supabase/contracts'
import { getCustomerById } from '@/lib/supabase/customers'
import type { CustomerAutocompleteItem } from '@/lib/supabase/customers'
import { useCompanyId } from '@/hooks/use-company-id'
import { CONTRACT_STATUS } from '@/types/enums'
import { pageTitle } from '@/lib/design'
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
  cpf: string | null
  cnpj: string | null
  person_type: string
}): CustomerAutocompleteItem {
  return {
    id: c.id,
    label: c.full_name ?? '—',
    person_type: c.person_type,
    full_name: c.full_name,
    legal_name: null,
    cpf: c.cpf,
    cnpj: c.cnpj,
  }
}

export default function EditarContratoPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : null
  const { companyId, loading: companyLoading } = useCompanyId()

  const [initialData, setInitialData] = useState<ContractFormState | null>(null)
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

        // Build customer autocomplete item from contract.customer
        if (contract.customer) {
          setInitialCustomer(customerToAutocompleteItem({
            id: contract.customer.id,
            full_name: contract.customer.full_name,
            cpf: contract.customer.cpf,
            cnpj: contract.customer.cnpj,
            person_type: contract.customer.cpf ? 'fisica' : 'juridica',
          }))
        }

        // Load guarantor if present
        if (contract.guarantor_customer_id) {
          const guarantor = await getCustomerById(contract.guarantor_customer_id)
          if (!cancelled && guarantor) {
            setInitialGuarantor(customerToAutocompleteItem({
              id: guarantor.id,
              full_name: guarantor.full_name,
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
        <h1 className={pageTitle}>Editar Contrato</h1>
        <p className="mt-2 text-amber-600">Contrato não encontrado.</p>
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
