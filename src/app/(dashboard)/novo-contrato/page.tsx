'use client'

import { Button, Input } from '@/components/ui'
import { getCompanyId } from '@/lib/supabase/company'
import { getCustomersAutocomplete } from '@/lib/supabase/customers'
import { insertContract } from '@/lib/supabase/contracts'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

export default function NovoContratoPage() {
  const router = useRouter()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingCompany, setLoadingCompany] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerOptions, setCustomerOptions] = useState<{ id: string; label: string }[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; label: string } | null>(null)
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const autocompleteRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    contract_number: '',
    contract_amount: '',
    installments_count: '12',
    customer_id: '',
  })

  useEffect(() => {
    getCompanyId().then((id) => {
      setCompanyId(id)
      setLoadingCompany(false)
    })
  }, [])

  const fetchCustomers = useCallback(async () => {
    if (!companyId) return
    try {
      const list = await getCustomersAutocomplete({
        companyId,
        search: customerSearch,
      })
      setCustomerOptions(list)
    } catch {
      setCustomerOptions([])
    }
  }, [companyId, customerSearch])

  useEffect(() => {
    if (!companyId) return
    const t = setTimeout(fetchCustomers, 300)
    return () => clearTimeout(t)
  }, [companyId, customerSearch, fetchCustomers])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId) {
      setError('Empresa não configurada.')
      return
    }
    const customerId = selectedCustomer?.id ?? form.customer_id
    if (!customerId) {
      setError('Selecione um cliente.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const amount = form.contract_amount ? parseFloat(form.contract_amount.replace(',', '.')) : null
      await insertContract({
        company_id: companyId,
        customer_id: customerId,
        contract_number: form.contract_number || null,
        contract_amount: amount,
        installments_count: parseInt(form.installments_count, 10) || 12,
        contract_category_id: 1,
        contract_type_id: 1,
        status_id: 1,
      })
      router.push('/contratos')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar contrato.')
    } finally {
      setLoading(false)
    }
  }

  if (loadingCompany) {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-6">
        <p className="text-zinc-600">Carregando...</p>
      </div>
    )
  }

  if (!companyId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Novo Contrato</h1>
        <p className="mt-2 text-amber-600">Configure sua empresa (company_users) para criar contratos.</p>
        <Link href="/contratos" className="mt-4 inline-block text-[#1E3A8A] hover:underline">
          Voltar para Contratos
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/contratos" className="text-zinc-600 hover:text-zinc-900">
          ← Contratos
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">Novo Contrato</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div ref={autocompleteRef} className="relative">
          <Input
            label="Cliente"
            value={selectedCustomer ? selectedCustomer.label : customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value)
              setSelectedCustomer(null)
              setShowAutocomplete(true)
            }}
            onFocus={() => setShowAutocomplete(true)}
            placeholder="Digite para buscar cliente..."
          />
          {showAutocomplete && (customerSearch || !selectedCustomer) && (
            <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded border border-zinc-200 bg-white py-1 shadow-lg">
              {customerOptions.length === 0 ? (
                <li className="px-4 py-2 text-sm text-zinc-500">Nenhum cliente encontrado</li>
              ) : (
                customerOptions.map((opt) => (
                  <li key={opt.id}>
                    <button
                      type="button"
                      className="w-full px-4 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-100"
                      onClick={() => {
                        setSelectedCustomer(opt)
                        setForm((f) => ({ ...f, customer_id: opt.id }))
                        setCustomerSearch('')
                        setShowAutocomplete(false)
                      }}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        <Input
          label="Número do contrato"
          value={form.contract_number}
          onChange={(e) => setForm((f) => ({ ...f, contract_number: e.target.value }))}
        />
        <Input
          label="Valor (R$)"
          type="text"
          inputMode="decimal"
          value={form.contract_amount}
          onChange={(e) => setForm((f) => ({ ...f, contract_amount: e.target.value }))}
          placeholder="0,00"
        />
        <Input
          label="Quantidade de parcelas"
          type="number"
          min={1}
          value={form.installments_count}
          onChange={(e) => setForm((f) => ({ ...f, installments_count: e.target.value }))}
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Criar contrato'}
          </Button>
          <Link href="/contratos">
            <Button type="button" variant="secondary">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
