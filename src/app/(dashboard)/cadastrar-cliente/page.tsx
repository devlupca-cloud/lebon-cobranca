'use client'

import { Button, Input } from '@/components/ui'
import { getCompanyId } from '@/lib/supabase/company'
import { insertCustomer } from '@/lib/supabase/customers'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function CadastrarClientePage() {
  const router = useRouter()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingCompany, setLoadingCompany] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    person_type: 'pf' as 'pf' | 'pj',
    full_name: '',
    legal_name: '',
    trade_name: '',
    cpf: '',
    cnpj: '',
    email: '',
    phone: '',
    mobile: '',
    status_id: 1,
  })

  useEffect(() => {
    getCompanyId().then((id) => {
      setCompanyId(id)
      setLoadingCompany(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId) {
      setError('Empresa não configurada.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await insertCustomer({
        company_id: companyId,
        person_type: form.person_type,
        full_name: form.person_type === 'pf' ? form.full_name : null,
        legal_name: form.person_type === 'pj' ? form.legal_name : null,
        trade_name: form.person_type === 'pj' ? form.trade_name : null,
        cpf: form.person_type === 'pf' ? form.cpf || null : null,
        cnpj: form.person_type === 'pj' ? form.cnpj || null : null,
        email: form.email || null,
        phone: form.phone || null,
        mobile: form.mobile || null,
        status_id: form.status_id,
      })
      router.push('/clientes')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao cadastrar cliente.')
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
        <h1 className="text-2xl font-semibold text-zinc-900">Cadastrar Cliente</h1>
        <p className="mt-2 text-amber-600">Configure sua empresa (company_users) para cadastrar clientes.</p>
        <Link href="/clientes" className="mt-4 inline-block text-[#1E3A8A] hover:underline">
          Voltar para Clientes
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/clientes" className="text-zinc-600 hover:text-zinc-900">
          ← Clientes
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">Cadastrar Cliente</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="person_type"
              checked={form.person_type === 'pf'}
              onChange={() => setForm((f) => ({ ...f, person_type: 'pf' }))}
              className="rounded border-zinc-300 text-[#1E3A8A] focus:ring-[#1E3A8A]"
            />
            Pessoa Física
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="person_type"
              checked={form.person_type === 'pj'}
              onChange={() => setForm((f) => ({ ...f, person_type: 'pj' }))}
              className="rounded border-zinc-300 text-[#1E3A8A] focus:ring-[#1E3A8A]"
            />
            Pessoa Jurídica
          </label>
        </div>

        {form.person_type === 'pf' ? (
          <Input
            label="Nome completo"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            required
          />
        ) : (
          <>
            <Input
              label="Razão social"
              value={form.legal_name}
              onChange={(e) => setForm((f) => ({ ...f, legal_name: e.target.value }))}
              required
            />
            <Input
              label="Nome fantasia"
              value={form.trade_name}
              onChange={(e) => setForm((f) => ({ ...f, trade_name: e.target.value }))}
            />
          </>
        )}

        {form.person_type === 'pf' && (
          <Input
            label="CPF"
            value={form.cpf}
            onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))}
          />
        )}
        {form.person_type === 'pj' && (
          <Input
            label="CNPJ"
            value={form.cnpj}
            onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))}
          />
        )}

        <Input
          label="E-mail"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <Input
          label="Telefone"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />
        <Input
          label="Celular"
          value={form.mobile}
          onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
          <Link href="/clientes">
            <Button type="button" variant="secondary">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
