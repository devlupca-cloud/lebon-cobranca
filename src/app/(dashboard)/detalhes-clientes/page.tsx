'use client'

import { getCustomerById } from '@/lib/supabase/customers'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'
import type { Customer } from '@/types/database'

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

function DetalhesClientesContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCustomer = useCallback(async (customerId: string) => {
    setLoading(true)
    setError(null)
    try {
      const c = await getCustomerById(customerId)
      setCustomer(c)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar cliente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (id) fetchCustomer(id)
    else {
      setCustomer(null)
      setLoading(false)
    }
  }, [id, fetchCustomer])

  if (!id) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Detalhes do Cliente</h1>
        <p className="mt-2 text-zinc-600">Informe o ID do cliente na URL (ex.: ?id=...).</p>
        <Link href="/clientes" className="mt-4 inline-block text-[#1E3A8A] hover:underline">
          Voltar para Clientes
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-6">
        <p className="text-zinc-600">Carregando cliente...</p>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Detalhes do Cliente</h1>
        <p className="mt-2 text-red-600">{error ?? 'Cliente não encontrado.'}</p>
        <Link href="/clientes" className="mt-4 inline-block text-[#1E3A8A] hover:underline">
          Voltar para Clientes
        </Link>
      </div>
    )
  }

  const displayName =
    customer.full_name ?? customer.legal_name ?? customer.trade_name ?? '—'
  const doc =
    customer.person_type === 'pf' ? customer.cpf : customer.cnpj
  const phone = customer.mobile ?? customer.phone ?? '—'

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/clientes" className="text-zinc-600 hover:text-zinc-900">
          ← Clientes
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">Detalhes do Cliente</h1>
      </div>

      <div className="rounded-[8px] border border-zinc-200 bg-white p-6 shadow-sm">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-zinc-500">Nome</dt>
            <dd className="mt-1 text-zinc-900">{displayName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-zinc-500">
              {customer.person_type === 'pf' ? 'CPF' : 'CNPJ'}
            </dt>
            <dd className="mt-1 text-zinc-900">{formatCpfCnpj(doc)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-zinc-500">E-mail</dt>
            <dd className="mt-1 text-zinc-900">{customer.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-zinc-500">Telefone / Celular</dt>
            <dd className="mt-1 text-zinc-900">{phone}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-zinc-500">Código do cliente</dt>
            <dd className="mt-1 text-zinc-900">{customer.customer_code ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-zinc-500">Indicação</dt>
            <dd className="mt-1 text-zinc-900">{customer.referral ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-zinc-500">Limite de crédito</dt>
            <dd className="mt-1 text-zinc-900">
              {customer.credit_limit != null
                ? new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(customer.credit_limit)
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-zinc-500">Saldo devedor</dt>
            <dd className="mt-1 text-zinc-900">
              {customer.outstanding_balance != null
                ? new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(customer.outstanding_balance)
                : '—'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

export default function DetalhesClientesPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[200px] items-center justify-center p-6"><p className="text-zinc-600">Carregando...</p></div>}>
      <DetalhesClientesContent />
    </Suspense>
  )
}
