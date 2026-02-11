'use client'

import { ClienteForm, customerToFormState } from '@/components/cliente-form'
import { getAddressById, getCustomerById } from '@/lib/supabase/customers'
import { pageTitle } from '@/lib/design'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function EditarClientePage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : null
  const [initialData, setInitialData] = useState<ReturnType<typeof customerToFormState> | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setNotFound(true)
      return
    }
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    async function load() {
      try {
        const customer = await getCustomerById(id!)
        if (cancelled || !customer) {
          if (!cancelled) setNotFound(true)
          return
        }
        let address = null
        if (customer.address_id) {
          address = await getAddressById(customer.address_id)
        }
        if (!cancelled) {
          setInitialData(customerToFormState(customer, address ?? undefined))
        }
      } catch {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-6">
        <p className="text-[#57636C]">Carregando cliente...</p>
      </div>
    )
  }

  if (notFound || !id) {
    return (
      <div className="p-6">
        <h1 className={pageTitle}>Editar Cliente</h1>
        <p className="mt-2 text-amber-600">Cliente não encontrado.</p>
        <Link href="/clientes" className="mt-4 inline-block text-[#1E3A8A] hover:underline">
          Voltar para Clientes
        </Link>
      </div>
    )
  }

  return (
    <ClienteForm
      mode="edit"
      customerId={id}
      initialData={initialData ?? undefined}
    />
  )
}
