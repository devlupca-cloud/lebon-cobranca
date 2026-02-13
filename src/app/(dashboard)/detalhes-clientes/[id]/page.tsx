'use client'

import { ConfirmModal, LoadingScreen } from '@/components/ui'
import { useCompanyId } from '@/hooks/use-company-id'
import { useHeader } from '@/contexts/header-context'
import { Button } from '@/components/ui'
import { getCustomerById, getAddressById } from '@/lib/supabase/customers'
import { getCustomerFiles, uploadCustomerFile, deleteCustomerFile } from '@/lib/supabase/files'
import type { Customer } from '@/types/database'
import type { CustomerFile } from '@/types/database'
import type { AddressRow } from '@/lib/supabase/customers'
import { formatCPFOrCNPJ, formatPhone } from '@/lib/format'
import { card, pageSubtitle, buttonPrimary } from '@/lib/design'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MdArrowBack, MdEdit } from 'react-icons/md'

export default function DetalhesClientePage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : null
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [address, setAddress] = useState<AddressRow | null>(null)
  const [files, setFiles] = useState<CustomerFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [fileToDeleteId, setFileToDeleteId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { setLeftContent, setTitle, setBreadcrumb } = useHeader()
  useEffect(() => {
    setTitle('Detalhes do Cliente')
    setBreadcrumb([
      { label: 'Home', href: '/home' },
      { label: 'Clientes', href: '/clientes' },
      { label: 'Detalhes' },
    ])
    setLeftContent(
      <div className="flex items-center gap-4">
        <Link href="/clientes">
          <Button
            type="button"
            className="border border-white bg-[#1E3A8A] text-white hover:bg-[#1E3A8A]/90"
          >
            <MdArrowBack className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        {id && (
          <Link href={`/editar-cliente/${id}`}>
            <Button
              type="button"
              className="border border-white bg-[#1E3A8A] text-white hover:bg-[#1E3A8A]/90"
            >
              <MdEdit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </Link>
        )}
      </div>
    )
    return () => {
      setLeftContent(null)
      setTitle('')
      setBreadcrumb([])
    }
  }, [setLeftContent, setTitle, setBreadcrumb, id])

  // Título dinâmico com nome do cliente quando carregado
  const displayNameForTitle =
    customer?.full_name ?? customer?.legal_name ?? customer?.trade_name ?? null
  useEffect(() => {
    if (displayNameForTitle) setTitle(displayNameForTitle)
  }, [displayNameForTitle, setTitle])

  const fetchCustomer = useCallback(async () => {
    if (!id || !companyId) return
    setLoading(true)
    setError(null)
    try {
      const c = await getCustomerById(id)
      if (!c) {
        setError('Cliente não encontrado.')
        return
      }
      setCustomer(c)
      if (c.address_id) {
        const addr = await getAddressById(c.address_id)
        setAddress(addr)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar cliente.')
    } finally {
      setLoading(false)
    }
  }, [id, companyId])

  useEffect(() => {
    if (!companyId || !id) return
    fetchCustomer()
  }, [companyId, id, fetchCustomer])

  const fetchFiles = useCallback(async () => {
    if (!id || !companyId) return
    setFilesLoading(true)
    setFilesError(null)
    try {
      const list = await getCustomerFiles(id, companyId)
      setFiles(list)
    } catch (e) {
      setFilesError(e instanceof Error ? e.message : 'Erro ao carregar documentos.')
    } finally {
      setFilesLoading(false)
    }
  }, [id, companyId])

  useEffect(() => {
    if (!id || !companyId) return
    fetchFiles()
  }, [id, companyId, fetchFiles])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id || !companyId) return
    setUploading(true)
    setFilesError(null)
    try {
      await uploadCustomerFile(id, companyId, file, 1)
      await fetchFiles()
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setFilesError(err instanceof Error ? err.message : 'Erro ao enviar arquivo.')
    } finally {
      setUploading(false)
    }
  }

  const handleConfirmDeleteFile = async () => {
    if (!fileToDeleteId || !companyId) return
    setFilesError(null)
    try {
      await deleteCustomerFile(fileToDeleteId, companyId)
      setFileToDeleteId(null)
      await fetchFiles()
    } catch (err) {
      setFilesError(err instanceof Error ? err.message : 'Erro ao remover.')
    }
  }

  if (companyLoading) return <LoadingScreen message="Carregando..." />
  if (companyError || !companyId) {
    return (
      <div className="p-6">
        <p className="text-amber-600">
          Configure sua empresa (company_users) para visualizar clientes.
        </p>
      </div>
    )
  }

  if (!id) {
    return (
      <div className="p-6">
        <p className="text-[#536471]">ID do cliente não informado.</p>
        <Link href="/clientes" className="mt-4 inline-block text-[#1E3A8A] hover:underline">
          Voltar para Clientes
        </Link>
      </div>
    )
  }

  if (loading) return <LoadingScreen message="Carregando cliente..." />

  if (error || !customer) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error ?? 'Cliente não encontrado.'}</p>
        <Link href="/clientes" className="mt-4 inline-block text-[#1E3A8A] hover:underline">
          Voltar para Clientes
        </Link>
      </div>
    )
  }

  const displayName =
    customer.full_name ?? customer.legal_name ?? customer.trade_name ?? '—'
  const isPJ = customer.person_type === 'juridica'
  const phone = customer.mobile ?? customer.phone ?? '—'
  const addressLine = address
    ? [address.street, address.number, address.neighbourhood, address.city, address.state]
        .filter(Boolean)
        .join(', ')
    : null

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-6">
        <p className={pageSubtitle}>
          {isPJ ? 'Pessoa Jurídica' : 'Pessoa Física'} · {customer.customer_code ?? 'Sem código'}
        </p>
      </div>

      <div className="space-y-6">
        <section className={card + ' p-6'}>
          <h2 className="mb-4 text-base font-semibold text-[#0f1419]">
            {isPJ ? 'Dados da empresa' : 'Dados pessoais'}
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Nome" value={displayName} />
            <Field label={isPJ ? 'CNPJ' : 'CPF'} value={formatCPFOrCNPJ(customer.cpf, customer.cnpj)} />
            {isPJ && <Field label="Razão social" value={customer.legal_name} />}
            {isPJ && <Field label="Inscrição estadual" value={customer.state_registration} />}
            {!isPJ && <Field label="Data de nascimento" value={customer.birth_date ? new Date(customer.birth_date).toLocaleDateString('pt-BR') : null} />}
            {!isPJ && <Field label="Profissão" value={customer.occupation} />}
            <Field label="Indicação" value={customer.referral} />
          </dl>
        </section>

        <section className={card + ' p-6'}>
          <h2 className="mb-4 text-base font-semibold text-[#0f1419]">Contato</h2>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="E-mail" value={customer.email} />
            <Field label="Telefone fixo" value={formatPhone(customer.phone)} />
            <Field label="Celular" value={formatPhone(customer.mobile)} />
          </dl>
        </section>

        {addressLine && (
          <section className={card + ' p-6'}>
            <h2 className="mb-4 text-base font-semibold text-[#0f1419]">Endereço</h2>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="CEP" value={address?.zip_code} />
              <Field label="Logradouro" value={address?.street} />
              <Field label="Número" value={address?.number} />
              <Field label="Complemento" value={address?.additional_info} />
              <Field label="Bairro" value={address?.neighbourhood} />
              <Field label="Cidade" value={address?.city} />
              <Field label="Estado" value={address?.state} />
            </dl>
          </section>
        )}

        <section className={card + ' p-6'}>
          <h2 className="mb-4 text-base font-semibold text-[#0f1419]">Financeiro</h2>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <Field label="Código do cliente" value={customer.customer_code} />
          </dl>
        </section>

        <section className={card + ' p-6'}>
          <h2 className="mb-4 text-base font-semibold text-[#0f1419]">Documentos</h2>
          {filesError && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {filesError}
            </div>
          )}
          <div className="mb-4 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Enviando...' : 'Enviar documento'}
            </Button>
          </div>
          {filesLoading ? (
            <p className="text-sm text-[#57636C]">Carregando documentos...</p>
          ) : files.length === 0 ? (
            <p className="text-sm text-[#57636C]">Nenhum documento anexado.</p>
          ) : (
            <ul className="space-y-2">
              {files.map((f) => (
                <li key={f.id} className="flex items-center justify-between rounded-[8px] border border-[#E0E3E7] bg-[#f1f4f8] px-4 py-2">
                  <a
                    href={f.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#1E3A8A] hover:underline"
                  >
                    {f.file_name ?? 'Documento'}
                  </a>
                  <div className="flex items-center gap-2">
                    {f.notes && <span className="text-sm text-[#57636C]">{f.notes}</span>}
                    <button
                      type="button"
                      onClick={() => setFileToDeleteId(f.id)}
                      className="text-sm font-medium text-red-600 hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ConfirmModal
        open={fileToDeleteId !== null}
        onClose={() => setFileToDeleteId(null)}
        onConfirm={handleConfirmDeleteFile}
        title="Remover documento"
        confirmLabel="Remover"
        variant="danger"
      >
        Remover este documento do cliente? O arquivo continuará no sistema, mas deixará de aparecer na lista.
      </ConfirmModal>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-[#536471]">{label}</dt>
      <dd className="mt-1 text-sm text-[#0f1419]">{value || '—'}</dd>
    </div>
  )
}
