'use client'

import { ConfirmModal, Input } from '@/components/ui'
import {
  buttonPrimary,
  buttonSecondary,
  card,
  input,
  label as labelClass,
} from '@/lib/design'
import { getCompanyId } from '@/lib/supabase/company'
import { insertCustomer, updateCustomer } from '@/lib/supabase/customers'
import { getCustomerFiles, uploadCustomerFilesBatch, deleteCustomerFile } from '@/lib/supabase/files'
import type { Customer, CustomerFile } from '@/types/database'
import type { AddressRow } from '@/lib/supabase/customers'
import {
  formatDateDDMMYYYY,
  formatISOToDDMMYYYY,
  maskCPF,
  maskCNPJ,
  maskCurrency,
  maskPhone,
  parseCurrency,
  parseDDMMYYYYToISO,
} from '@/lib/format'
import { fetchAddressByCep } from '@/lib/viacep'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MdDelete, MdOpenInNew } from 'react-icons/md'

type PersonType = 'pf' | 'pj'

const STATUS_OPTIONS = [
  { value: 1, label: 'Ativo' },
  { value: 2, label: 'Inativo' },
]

const MARITAL_OPTIONS = [
  { value: '', label: 'Não informado' },
  { value: 1, label: 'Solteiro(a)' },
  { value: 2, label: 'Casado(a)' },
  { value: 3, label: 'Divorciado(a)' },
  { value: 4, label: 'Viúvo(a)' },
  { value: 5, label: 'Outro' },
]

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

export const initialForm = {
  person_type: 'pf' as PersonType,
  customer_code: '',
  status_id: 1,
  full_name: '',
  legal_name: '',
  trade_name: '',
  cpf: '',
  cnpj: '',
  state_registration: '',
  birth_date: '',
  email: '',
  phone: '',
  mobile: '',
  occupation: '',
  marital_status_id: '' as string | number,
  referral: '',
  credit_limit: '',
  outstanding_balance: '',
  zip_code: '',
  street: '',
  number: '',
  additional_info: '',
  neighbourhood: '',
  city: '',
  state: '',
  images: [null, null, null] as (File | null)[],
}

export type FormState = typeof initialForm

const IMAGE_LABELS = [
  'Comprovante de Endereço',
  'RG ou CPF',
  'Comprovante de Renda',
]

/** Mapeia Customer + Address do banco para o estado do formulário (edição). */
export function customerToFormState(
  customer: Customer,
  address?: AddressRow | null
): FormState {
  return {
    ...initialForm,
    person_type: (customer.person_type === 'juridica' ? 'pj' : 'pf') as PersonType,
    status_id: customer.status_id,
    full_name: customer.full_name ?? '',
    legal_name: customer.legal_name ?? '',
    trade_name: customer.trade_name ?? '',
    cpf: customer.cpf ? maskCPF(customer.cpf) : '',
    cnpj: customer.cnpj ? maskCNPJ(customer.cnpj) : '',
    state_registration: customer.state_registration ?? '',
    birth_date: customer.birth_date ? formatISOToDDMMYYYY(customer.birth_date) : '',
    email: customer.email ?? '',
    phone: customer.phone ? maskPhone(customer.phone) : '',
    mobile: customer.mobile ? maskPhone(customer.mobile) : '',
    occupation: customer.occupation ?? '',
    marital_status_id: customer.marital_status_id ?? '',
    referral: customer.referral ?? '',
    customer_code: customer.customer_code ?? '',
    credit_limit:
      customer.credit_limit != null
        ? maskCurrency(Math.round(customer.credit_limit * 100).toString())
        : '',
    outstanding_balance:
      customer.outstanding_balance != null
        ? maskCurrency(Math.round(customer.outstanding_balance * 100).toString())
        : '',
    zip_code: address?.zip_code ?? '',
    street: address?.street ?? '',
    number: address?.number ?? '',
    additional_info: address?.additional_info ?? '',
    neighbourhood: address?.neighbourhood ?? '',
    city: address?.city ?? '',
    state: address?.state ?? '',
  }
}

export type ClienteFormProps = {
  mode: 'create' | 'edit'
  customerId?: string
  initialData?: FormState
}

export function ClienteForm({ mode, customerId, initialData }: ClienteFormProps) {
  const router = useRouter()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingCompany, setLoadingCompany] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(initialData ?? initialForm)
  const [creditLimitEditing, setCreditLimitEditing] = useState<string | null>(null)
  const [outstandingBalanceEditing, setOutstandingBalanceEditing] = useState<string | null>(null)
  const [customerFiles, setCustomerFiles] = useState<CustomerFile[]>([])
  const [customerFilesLoading, setCustomerFilesLoading] = useState(false)
  const [customerFilesError, setCustomerFilesError] = useState<string | null>(null)
  const [fileToDeleteId, setFileToDeleteId] = useState<string | null>(null)
  const creditLimitInputRef = useRef<HTMLInputElement>(null)
  const outstandingBalanceInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode === 'edit' && initialData) setForm(initialData)
  }, [mode, initialData])

  function formValueToEditingDigits(value: string): string {
    const n = parseCurrency(value)
    if (n === null) return ''
    return Math.round(n * 100).toString()
  }

  function digitsToReaisCents(digits: string): string {
    if (!digits) return ''
    const intPart = digits.length <= 2 ? '0' : digits.slice(0, -2).replace(/^0+/, '') || '0'
    const decPart = digits.length <= 2 ? digits.padStart(2, '0') : digits.slice(-2)
    return `${intPart},${decPart}`
  }

  useEffect(() => {
    getCompanyId().then((id) => {
      setCompanyId(id)
      setLoadingCompany(false)
    })
  }, [])

  const fetchCustomerFiles = useCallback(async () => {
    if (!customerId || !companyId) return
    setCustomerFilesLoading(true)
    setCustomerFilesError(null)
    try {
      const list = await getCustomerFiles(customerId, companyId)
      setCustomerFiles(list)
    } catch (e) {
      setCustomerFilesError(e instanceof Error ? e.message : 'Erro ao carregar documentos.')
    } finally {
      setCustomerFilesLoading(false)
    }
  }, [customerId, companyId])

  useEffect(() => {
    if (mode === 'edit' && customerId && companyId) fetchCustomerFiles()
  }, [mode, customerId, companyId, fetchCustomerFiles])

  useEffect(() => {
    if (creditLimitEditing === null) return
    const el = creditLimitInputRef.current
    if (!el) return
    el.setSelectionRange(el.value.length, el.value.length)
  }, [creditLimitEditing])

  useEffect(() => {
    if (outstandingBalanceEditing === null) return
    const el = outstandingBalanceInputRef.current
    if (!el) return
    el.setSelectionRange(el.value.length, el.value.length)
  }, [outstandingBalanceEditing])

  function updateForm(updates: Partial<FormState>) {
    setForm((f) => ({ ...f, ...updates }))
  }

  function setImage(index: number, file: File | null) {
    setForm((f) => {
      const next = [...f.images]
      next[index] = file
      return { ...f, images: next }
    })
  }

  async function handleCepBlur() {
    const cep = form.zip_code.replace(/\D/g, '')
    if (cep.length !== 8) {
      setCepError(null)
      return
    }
    setCepError(null)
    setCepLoading(true)
    try {
      const address = await fetchAddressByCep(form.zip_code)
      if (address) {
        updateForm({
          street: address.logradouro || form.street,
          neighbourhood: address.bairro || form.neighbourhood,
          city: address.localidade || form.city,
          state: address.uf || form.state,
        })
      } else {
        setCepError('CEP não encontrado.')
      }
    } catch {
      setCepError('Não foi possível buscar o CEP.')
    } finally {
      setCepLoading(false)
    }
  }

  function buildPayload() {
    const creditLimit = parseCurrency(form.credit_limit)
    const outstandingBalance = parseCurrency(form.outstanding_balance)
    const maritalId =
      form.marital_status_id === '' || form.marital_status_id === null
        ? null
        : Number(form.marital_status_id)
    const hasAddress =
      form.street ||
      form.city ||
      form.zip_code ||
      form.number ||
      form.neighbourhood ||
      form.state ||
      form.additional_info
    return {
      person_type: form.person_type === 'pf' ? 'fisica' as const : 'juridica' as const,
      status_id: form.status_id,
      full_name: form.person_type === 'pf' ? form.full_name || null : null,
      legal_name: form.person_type === 'pj' ? form.legal_name || null : null,
      trade_name: form.person_type === 'pj' ? form.trade_name || null : null,
      cpf: form.person_type === 'pf' ? (form.cpf ? form.cpf.replace(/\D/g, '') : null) : null,
      cnpj: form.person_type === 'pj' ? (form.cnpj ? form.cnpj.replace(/\D/g, '') : null) : null,
      state_registration: form.person_type === 'pj' ? form.state_registration || null : null,
      birth_date: form.person_type === 'pf' ? parseDDMMYYYYToISO(form.birth_date) || null : null,
      email: form.email || null,
      phone: form.phone ? form.phone.replace(/\D/g, '') || null : null,
      mobile: form.mobile ? form.mobile.replace(/\D/g, '') || null : null,
      occupation: form.person_type === 'pf' ? form.occupation || null : null,
      marital_status_id: maritalId,
      referral: form.referral || null,
      customer_code: form.customer_code || null,
      credit_limit: Number.isFinite(creditLimit) ? creditLimit : null,
      outstanding_balance: Number.isFinite(outstandingBalance) ? outstandingBalance : null,
      address: hasAddress
        ? {
            street: form.street || null,
            number: form.number || null,
            neighbourhood: form.neighbourhood || null,
            city: form.city || null,
            state: form.state || null,
            zip_code: form.zip_code || null,
            additional_info: form.additional_info || null,
          }
        : null,
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId) {
      setError('Empresa não configurada.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const payload = buildPayload()
      let savedCustomerId: string

      if (mode === 'edit' && customerId) {
        await updateCustomer(customerId, companyId, payload)
        savedCustomerId = customerId
      } else {
        const created = await insertCustomer({
          ...payload,
          company_id: companyId,
          address: payload.address
            ? { ...payload.address, company_id: companyId }
            : null,
        })
        savedCustomerId = created.id
      }

      const filesToUpload = form.images
        .map((file, i) => {
          if (file instanceof File && file.size > 0) {
            return {
              file,
              fileTypeId: i + 1,
              notes: IMAGE_LABELS[i] ?? null,
            }
          }
          return null
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)

      if (filesToUpload.length > 0) {
        await uploadCustomerFilesBatch(savedCustomerId, companyId, filesToUpload)
      }

      router.push('/clientes')
      router.refresh()
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : e && typeof e === 'object' && 'message' in e
            ? String((e as { message: unknown }).message)
            : mode === 'edit'
              ? 'Erro ao atualizar cliente.'
              : 'Erro ao cadastrar cliente.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const isEdit = mode === 'edit'
  const submitLabel = loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Salvar cliente'

  async function handleConfirmDeleteFile() {
    if (!fileToDeleteId || !companyId) return
    setCustomerFilesError(null)
    try {
      await deleteCustomerFile(fileToDeleteId, companyId)
      setFileToDeleteId(null)
      await fetchCustomerFiles()
    } catch (e) {
      setCustomerFilesError(e instanceof Error ? e.message : 'Erro ao remover.')
    }
  }

  if (loadingCompany) {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-6">
        <p className="text-[#57636C]">Carregando...</p>
      </div>
    )
  }

  if (!companyId) {
    return (
      <div className="p-6">
        <p className="text-amber-600">
          Configure sua empresa (company_users) para continuar.
        </p>
        <Link href="/clientes" className="mt-4 inline-block text-[#1E3A8A] hover:underline">
          Voltar para Clientes
        </Link>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div
            className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        <section className={card + ' p-6'}>
          <h2 className="mb-4 text-base font-semibold text-[#14181B]">Tipo de Pessoa *</h2>
          <div className="inline-flex rounded-[8px] border border-[#e5e7eb] bg-[#f1f4f8] p-1">
            <button
              type="button"
              onClick={() => updateForm({ person_type: 'pf' })}
              className={`min-w-[140px] rounded-[6px] px-4 py-2.5 text-sm font-medium transition ${
                form.person_type === 'pf'
                  ? 'bg-[#1E3A8A] text-white shadow-sm'
                  : 'text-[#57636C] hover:bg-white hover:text-[#14181B]'
              }`}
            >
              Pessoa Física
            </button>
            <button
              type="button"
              onClick={() => updateForm({ person_type: 'pj' })}
              className={`min-w-[140px] rounded-[6px] px-4 py-2.5 text-sm font-medium transition ${
                form.person_type === 'pj'
                  ? 'bg-[#1E3A8A] text-white shadow-sm'
                  : 'text-[#57636C] hover:bg-white hover:text-[#14181B]'
              }`}
            >
              Pessoa Jurídica
            </button>
          </div>
        </section>

        <section className={card + ' p-6'}>
          <h2 className="mb-4 text-base font-semibold text-[#14181B]">
            {form.person_type === 'pf' ? 'Dados pessoais' : 'Dados da empresa'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {form.person_type === 'pf' ? (
              <>
                <Input
                  label="CPF *"
                  value={form.cpf}
                  onChange={(e) => updateForm({ cpf: maskCPF(e.target.value) })}
                  placeholder="000.000.000-00"
                  required
                />
                <Input
                  label="Nome completo *"
                  value={form.full_name}
                  onChange={(e) => updateForm({ full_name: e.target.value })}
                  placeholder="Nome completo"
                  required
                />
                <Input
                  label="Data de nascimento"
                  type="text"
                  value={form.birth_date}
                  onChange={(e) => updateForm({ birth_date: formatDateDDMMYYYY(e.target.value) })}
                  placeholder="dd-mm-aaaa"
                  maxLength={10}
                />
                <div className="w-full">
                  <label htmlFor="marital_status_id" className={labelClass}>
                    Estado civil
                  </label>
                  <select
                    id="marital_status_id"
                    value={form.marital_status_id}
                    onChange={(e) =>
                      updateForm({
                        marital_status_id: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    className={input}
                  >
                    <option value="">Selecione o estado civil</option>
                    {MARITAL_OPTIONS.filter((o) => o.value !== '').map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Profissão"
                  value={form.occupation}
                  onChange={(e) => updateForm({ occupation: e.target.value })}
                  placeholder="Profissão"
                />
              </>
            ) : (
              <>
                <Input
                  label="CNPJ *"
                  value={form.cnpj}
                  onChange={(e) => updateForm({ cnpj: maskCNPJ(e.target.value) })}
                  placeholder="00.000.000/0000-00"
                  required
                />
                <Input
                  label="Nome fantasia *"
                  value={form.trade_name}
                  onChange={(e) => updateForm({ trade_name: e.target.value })}
                  placeholder="Nome fantasia"
                  required
                />
                <Input
                  label="Razão social *"
                  value={form.legal_name}
                  onChange={(e) => updateForm({ legal_name: e.target.value })}
                  placeholder="Razão social da empresa"
                  required
                />
                <Input
                  label="Inscrição estadual *"
                  value={form.state_registration}
                  onChange={(e) => updateForm({ state_registration: e.target.value })}
                  placeholder="Inscrição Estadual"
                  required
                />
              </>
            )}
          </div>
        </section>

        {isEdit && customerId && (
          <section className={card + ' p-6'}>
            <h2 className="mb-4 text-base font-semibold text-[#14181B]">Documentos já anexados</h2>
            {customerFilesError && (
              <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {customerFilesError}
              </div>
            )}
            {customerFilesLoading ? (
              <p className="text-sm text-[#57636C]">Carregando documentos...</p>
            ) : customerFiles.length === 0 ? (
              <p className="text-sm text-[#57636C]">Nenhum documento anexado.</p>
            ) : (
              <ul className="space-y-2">
                {customerFiles.map((f) => (
                  <li
                    key={f.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[#E0E3E7] bg-[#f1f4f8] px-4 py-2"
                  >
                    <a
                      href={f.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 font-medium text-[#1E3A8A] hover:underline"
                    >
                      {f.file_name ?? 'Documento'}
                      <MdOpenInNew className="h-4 w-4 shrink-0" />
                    </a>
                    <div className="flex items-center gap-2">
                      {f.notes && (
                        <span className="text-sm text-[#57636C]">{f.notes}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setFileToDeleteId(f.id)}
                        title="Remover documento"
                        aria-label="Remover documento"
                        className="rounded-[8px] p-1.5 text-[#ff5963] transition-colors hover:bg-[#ff5963]/10"
                      >
                        <MdDelete className="h-5 w-5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className={card + ' p-6'}>
          <h2 className="mb-4 text-base font-semibold text-[#14181B]">Documentos / Imagens</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-2 rounded-[8px] border-2 border-dashed border-[#e5e7eb] bg-[#f8fafc] p-4 transition hover:border-[#1E3A8A]/40"
              >
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  id={`image-${index}`}
                  onChange={(e) => setImage(index, e.target.files?.[0] ?? null)}
                />
                <label
                  htmlFor={`image-${index}`}
                  className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1 text-center text-sm text-[#57636C]"
                >
                  {form.images[index] ? (
                    <>
                      <span className="font-medium text-[#14181B]">{form.images[index]?.name}</span>
                      <span className="text-xs">
                        {(form.images[index]!.size / 1024).toFixed(1)} KB
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-[#14181B]">{IMAGE_LABELS[index]}</span>
                      <span className="text-xs">Clique para anexar</span>
                    </>
                  )}
                </label>
                {form.images[index] && (
                  <button
                    type="button"
                    onClick={() => setImage(index, null)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className={card + ' p-6'}>
          <h2 className="mb-4 text-base font-semibold text-[#14181B]">Endereço</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Input
                label="CEP *"
                value={form.zip_code}
                onChange={(e) => {
                  setCepError(null)
                  updateForm({ zip_code: e.target.value })
                }}
                onBlur={handleCepBlur}
                placeholder="00000-000"
                disabled={cepLoading}
              />
              {cepLoading && (
                <p className="mt-1 text-xs text-[#57636C]">Buscando endereço...</p>
              )}
              {cepError && (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {cepError}
                </p>
              )}
            </div>
            <Input
              label="Logradouro *"
              value={form.street}
              onChange={(e) => updateForm({ street: e.target.value })}
              placeholder="Rua, Avenida, etc."
            />
            <Input
              label="Número *"
              value={form.number}
              onChange={(e) => updateForm({ number: e.target.value })}
              placeholder="Nº"
            />
            <Input
              label="Complemento"
              value={form.additional_info}
              onChange={(e) => updateForm({ additional_info: e.target.value })}
              placeholder="Apto, Casa, etc."
            />
            <Input
              label="Bairro *"
              value={form.neighbourhood}
              onChange={(e) => updateForm({ neighbourhood: e.target.value })}
              placeholder="Bairro"
            />
            <Input
              label="Cidade *"
              value={form.city}
              onChange={(e) => updateForm({ city: e.target.value })}
              placeholder="Cidade"
            />
            <div>
              <label htmlFor="state" className={labelClass}>
                Estado *
              </label>
              <select
                id="state"
                value={form.state}
                onChange={(e) => updateForm({ state: e.target.value })}
                className={input}
              >
                <option value="">UF</option>
                {UF_OPTIONS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className={card + ' p-6'}>
          <h2 className="mb-4 text-base font-semibold text-[#14181B]">Contatos</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <Input
                label="Indicação"
                value={form.referral}
                onChange={(e) => updateForm({ referral: e.target.value })}
                placeholder="Quem indicou este cliente?"
              />
            </div>
            <Input
              label="Telefone fixo"
              value={form.phone}
              onChange={(e) => updateForm({ phone: maskPhone(e.target.value) })}
              placeholder="(00) 0000-0000"
            />
            <Input
              label="Celular *"
              value={form.mobile}
              onChange={(e) => updateForm({ mobile: maskPhone(e.target.value) })}
              placeholder="(00) 00000-0000"
            />
            <Input
              label="E-mail *"
              type="email"
              value={form.email}
              onChange={(e) => updateForm({ email: e.target.value })}
              placeholder="email@exemplo.com"
            />
            <Input
              label="Código do cliente"
              value={form.customer_code}
              onChange={(e) => updateForm({ customer_code: e.target.value })}
              placeholder="Digite o código do cliente"
            />
            <div className="w-full">
              <label htmlFor="credit_limit" className={labelClass}>
                Limite do cliente
              </label>
              <div className="flex rounded-[8px] border border-[#e5e7eb] bg-white focus-within:border-[#1E3A8A] focus-within:ring-2 focus-within:ring-[#1E3A8A]/20">
                <span className="flex h-[42px] items-center pl-3 text-sm text-[#57636C]">R$</span>
                <input
                  ref={creditLimitInputRef}
                  id="credit_limit"
                  type="text"
                  inputMode="decimal"
                  value={
                    creditLimitEditing !== null
                      ? digitsToReaisCents(creditLimitEditing)
                      : form.credit_limit
                  }
                  onFocus={() =>
                    setCreditLimitEditing(formValueToEditingDigits(form.credit_limit))
                  }
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 15)
                    setCreditLimitEditing(digits)
                  }}
                  onBlur={() => {
                    if (creditLimitEditing !== null) {
                      updateForm({
                        credit_limit: creditLimitEditing
                          ? maskCurrency(creditLimitEditing)
                          : '',
                      })
                      setCreditLimitEditing(null)
                    }
                  }}
                  className="h-[42px] flex-1 rounded-r-[8px] border-0 bg-transparent px-3 py-2.5 text-sm text-[#0f1419] placeholder:text-[#94a3b8] focus:outline-none"
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="w-full">
              <label htmlFor="outstanding_balance" className={labelClass}>
                Saldo devedor
              </label>
              <div className="flex rounded-[8px] border border-[#e5e7eb] bg-white focus-within:border-[#1E3A8A] focus-within:ring-2 focus-within:ring-[#1E3A8A]/20">
                <span className="flex h-[42px] items-center pl-3 text-sm text-[#57636C]">R$</span>
                <input
                  ref={outstandingBalanceInputRef}
                  id="outstanding_balance"
                  type="text"
                  inputMode="decimal"
                  value={
                    outstandingBalanceEditing !== null
                      ? digitsToReaisCents(outstandingBalanceEditing)
                      : form.outstanding_balance
                  }
                  onFocus={() =>
                    setOutstandingBalanceEditing(
                      formValueToEditingDigits(form.outstanding_balance)
                    )
                  }
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 15)
                    setOutstandingBalanceEditing(digits)
                  }}
                  onBlur={() => {
                    if (outstandingBalanceEditing !== null) {
                      updateForm({
                        outstanding_balance: outstandingBalanceEditing
                          ? maskCurrency(outstandingBalanceEditing)
                          : '',
                      })
                      setOutstandingBalanceEditing(null)
                    }
                  }}
                  className="h-[42px] flex-1 rounded-r-[8px] border-0 bg-transparent px-3 py-2.5 text-sm text-[#0f1419] placeholder:text-[#94a3b8] focus:outline-none"
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="w-full">
              <label htmlFor="status_id" className={labelClass}>
                Status
              </label>
              <select
                id="status_id"
                value={form.status_id}
                onChange={(e) => updateForm({ status_id: Number(e.target.value) })}
                className={input}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-3 border-t border-[#E0E3E7] pt-6">
          <button type="submit" className={buttonPrimary} disabled={loading}>
            {submitLabel}
          </button>
          <Link href="/clientes">
            <button type="button" className={buttonSecondary}>
              Cancelar
            </button>
          </Link>
        </div>
      </form>

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
