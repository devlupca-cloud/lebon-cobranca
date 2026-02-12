'use client'

import { ContratoForm, initialContractForm } from '@/components/contrato-form'
import { LoadingScreen } from '@/components/ui'
import { getCustomerById } from '@/lib/supabase/customers'
import type { CustomerAutocompleteItem } from '@/lib/supabase/customers'
import { useCompanyId } from '@/hooks/use-company-id'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'

function toAutocompleteItem(c: {
  id: string
  full_name: string | null
  legal_name: string | null
  cpf: string | null
  cnpj: string | null
  person_type: string
}): CustomerAutocompleteItem {
  return {
    id: c.id,
    label: c.full_name ?? c.legal_name ?? '—',
    person_type: c.person_type,
    full_name: c.full_name,
    legal_name: c.legal_name,
    cpf: c.cpf,
    cnpj: c.cnpj,
  }
}

function NovoContratoContent() {
  const searchParams = useSearchParams()
  const customerIdParam = searchParams.get('customerId')
  const valorParam = searchParams.get('valor')
  const parcelasParam = searchParams.get('parcelas')
  const taxaParam = searchParams.get('taxa')
  const firstDueDateParam = searchParams.get('firstDueDate')
  const { companyId } = useCompanyId()
  const [initialCustomer, setInitialCustomer] = useState<CustomerAutocompleteItem | null>(null)
  const [, setLoadingCustomer] = useState(false)

  const initialDataFromSimulacao = useMemo(() => {
    const base = { ...initialContractForm }
    let changed = false
    if (valorParam != null && valorParam.trim() !== '') {
      base.contract_amount = valorParam.trim().replace('.', ',')
      changed = true
    }
    if (parcelasParam != null && parcelasParam.trim() !== '') {
      base.installments_count = parcelasParam.trim()
      changed = true
    }
    if (taxaParam != null && taxaParam.trim() !== '') {
      base.interest_rate = taxaParam.trim().replace('.', ',')
      changed = true
    }
    if (firstDueDateParam != null && /^\d{4}-\d{2}-\d{2}$/.test(firstDueDateParam.trim())) {
      base.first_due_date = firstDueDateParam.trim()
      changed = true
    }
    return changed ? base : undefined
  }, [valorParam, parcelasParam, taxaParam, firstDueDateParam])

  useEffect(() => {
    if (!customerIdParam || !companyId) {
      setInitialCustomer(null)
      return
    }
    let cancelled = false
    setLoadingCustomer(true)
    getCustomerById(customerIdParam)
      .then((c) => {
        if (!cancelled && c) setInitialCustomer(toAutocompleteItem(c))
        else if (!cancelled) setInitialCustomer(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingCustomer(false)
      })
    return () => { cancelled = true }
  }, [customerIdParam, companyId])

  return (
    <ContratoForm
      mode="create"
      initialData={initialDataFromSimulacao}
      initialCustomer={initialCustomer ?? undefined}
      initialGuarantor={null}
    />
  )
}

export default function NovoContratoPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Carregando..." />}>
      <NovoContratoContent />
    </Suspense>
  )
}
