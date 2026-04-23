'use client'

import { Button, CurrencyInput } from '@/components/ui'
import { getCompanyId } from '@/lib/supabase/company'
import { getCustomersAutocomplete, type CustomerAutocompleteItem, getCustomerById, getAddressById } from '@/lib/supabase/customers'
import { formatCPF, formatCNPJ } from '@/lib/format'
import { insertContract, updateContract, getNextContractNumber, getContractById, getInstallmentsByContract } from '@/lib/supabase/contracts'
import { CONTRACT_STATUS, CONTRACT_CATEGORY, CONTRACT_TYPE } from '@/types/enums'
import type { ContractWithRelations } from '@/types/database'
import { pageTitle, pageSubtitle, label, input, card } from '@/lib/design'
import { calcularParcela, formatCurrency } from '@/lib/simulacao'
import { generateContractPdf } from '@/lib/pdf/contract-pdf'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PopupSimulacao } from '@/components/popup-simulacao'
import { MdDescription, MdPictureAsPdf, MdSearch, MdSwapHoriz } from 'react-icons/md'

/** Nome para exibição (PF: full_name; PJ: legal_name/trade_name); usa qualquer campo preenchido. */
function getCustomerDisplayName(c: CustomerAutocompleteItem | null): string {
  if (!c) return '—'
  const name =
    c.person_type === 'juridica'
      ? (c.legal_name ?? c.trade_name ?? c.full_name ?? c.label)
      : (c.full_name ?? c.legal_name ?? c.trade_name ?? c.label)
  return (typeof name === 'string' ? name.trim() : '') || '—'
}

/** Tipo do contrato (dropdown "Escolha o Tipo" no FlutterFlow): Financiamento | Base de Cálculo */
const TIPO_OPCOES = [
  { value: CONTRACT_CATEGORY.FINANCING, label: 'Financiamento' },
  { value: CONTRACT_CATEGORY.LOAN, label: 'Base de Cálculo' },
  { value: CONTRACT_CATEGORY.CHECK_FINANCING, label: 'Cheque' },
] as const

/** Sub-tipo quando Financiamento (radio no FlutterFlow): Caixa | Aprovado */
const FINANCIAMENTO_OPCOES = [
  { value: 'caixa', label: 'Financiamento (Caixa)' },
  { value: 'aprovado', label: 'Financiamento Aprovado' },
] as const

const STATUS_OPTIONS = [
  { value: CONTRACT_STATUS.DRAFT, label: 'Rascunho' },
  { value: CONTRACT_STATUS.ACTIVE, label: 'Ativo' },
] as const

export type ContractFormState = {
  contract_number: string
  inclusion_date: string
  contract_amount: string
  installments_count: string
  customer_id: string
  first_due_date: string
  valor_titulo: string
  tipo: number
  financiamento_sub: string
  bank: string
  admin_fee_rate: string
  interest_rate: string
  valor_financiado: string
  status_id: number
  notes: string
}

export const initialContractForm: ContractFormState = {
  contract_number: '',
  inclusion_date: new Date().toISOString().split('T')[0],
  contract_amount: '',
  installments_count: '12',
  customer_id: '',
  first_due_date: '',
  valor_titulo: '',
  tipo: CONTRACT_CATEGORY.FINANCING,
  financiamento_sub: 'caixa',
  bank: '',
  admin_fee_rate: '',
  interest_rate: '',
  valor_financiado: '',
  // Padrão "Ativo": ao salvar, gera as parcelas automaticamente e o contrato
  // entra no extrato financeiro e no fluxo de inadimplentes. Usuário pode
  // trocar para "Rascunho" se quiser salvar sem gerar parcelas.
  status_id: CONTRACT_STATUS.ACTIVE,
  notes: '',
}

/** Converts a contract from the database to the form state (for edit mode). */
export function contractToFormState(contract: ContractWithRelations): ContractFormState {
  const notesRaw = contract.notes ?? ''
  const hasSub = notesRaw.includes('Financiamento (Caixa)') || notesRaw.includes('Financiamento (Aprovado)')
  const financiamentoSub = notesRaw.includes('Financiamento (Caixa)')
    ? 'caixa'
    : notesRaw.includes('Financiamento (Aprovado)')
      ? 'aprovado'
      : 'caixa'
  const cleanNotes = hasSub
    ? notesRaw
        .replace(/\s*\|\s*Financiamento \((Caixa|Aprovado)\)/, '')
        .replace(/Financiamento \((Caixa|Aprovado)\)\s*\|\s*/, '')
        .replace(/Financiamento \((Caixa|Aprovado)\)/, '')
        .trim()
    : notesRaw

  return {
    contract_number: contract.contract_number ?? '',
    inclusion_date: contract.inclusion_date ?? new Date().toISOString().split('T')[0],
    contract_amount: contract.contract_amount != null ? String(contract.contract_amount).replace('.', ',') : '',
    installments_count: String(contract.installments_count ?? 12),
    customer_id: contract.customer_id,
    first_due_date: contract.first_due_date ?? '',
    valor_titulo: '',
    tipo: contract.contract_category_id ?? CONTRACT_CATEGORY.FINANCING,
    financiamento_sub: financiamentoSub,
    bank: contract.bank ?? '',
    admin_fee_rate: contract.admin_fee_rate != null ? String(contract.admin_fee_rate).replace('.', ',') : '',
    interest_rate: contract.interest_rate != null ? String(contract.interest_rate).replace('.', ',') : '',
    valor_financiado: contract.total_amount != null && contract.total_amount !== contract.contract_amount
      ? String(contract.total_amount).replace('.', ',')
      : '',
    status_id: contract.status_id,
    notes: cleanNotes,
  }
}

export type ContratoFormProps = {
  mode: 'create' | 'edit'
  contractId?: string
  companyId?: string
  initialData?: ContractFormState
  initialCustomer?: CustomerAutocompleteItem | null
  initialGuarantor?: CustomerAutocompleteItem | null
  /** Fields that should be disabled in edit mode (e.g. financial fields for active contracts) */
  disabledFields?: Set<string>
  /** If true, the entire form is read-only */
  readOnly?: boolean
}

export function ContratoForm({
  mode,
  contractId,
  companyId: companyIdProp,
  initialData,
  initialCustomer,
  initialGuarantor,
  disabledFields,
  readOnly,
}: ContratoFormProps) {
  const router = useRouter()
  const [companyId, setCompanyId] = useState<string | null>(companyIdProp ?? null)
  const [loading, setLoading] = useState(false)
  const [loadingCompany, setLoadingCompany] = useState(!companyIdProp)
  const [error, setError] = useState<string | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerOptions, setCustomerOptions] = useState<CustomerAutocompleteItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerAutocompleteItem | null>(
    initialCustomer !== undefined ? (initialCustomer ?? null) : (mode === 'create' ? null : null)
  )
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [simulacaoOpen, setSimulacaoOpen] = useState(false)
  const autocompleteRef = useRef<HTMLDivElement>(null)

  const [guarantorSearch, setGuarantorSearch] = useState('')
  const [guarantorOptions, setGuarantorOptions] = useState<CustomerAutocompleteItem[]>([])
  const [selectedGuarantor, setSelectedGuarantor] = useState<CustomerAutocompleteItem | null>(
    mode === 'create' ? null : (initialGuarantor ?? null)
  )
  const [showGuarantorDropdown, setShowGuarantorDropdown] = useState(false)
  const guarantorRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState<ContractFormState>(initialData ?? initialContractForm)

  useEffect(() => {
    if (mode === 'edit' && initialData) setForm(initialData)
  }, [mode, initialData])

  useEffect(() => {
    if (initialCustomer !== undefined) setSelectedCustomer(initialCustomer ?? null)
  }, [initialCustomer])

  useEffect(() => {
    if (mode === 'edit' && initialGuarantor !== undefined) setSelectedGuarantor(initialGuarantor)
  }, [mode, initialGuarantor])

  useEffect(() => {
    if (companyIdProp) {
      setCompanyId(companyIdProp)
      setLoadingCompany(false)
      return
    }
    getCompanyId().then((id) => {
      setCompanyId(id)
      setLoadingCompany(false)
    })
  }, [companyIdProp])

  // Auto-generate contract number for new contracts
  useEffect(() => {
    if (mode !== 'create' || !companyId) return
    let cancelled = false
    getNextContractNumber(companyId).then((num) => {
      if (!cancelled) setForm((f) => ({ ...f, contract_number: num }))
    })
    return () => { cancelled = true }
  }, [mode, companyId])

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

  const fetchGuarantorOptions = useCallback(async () => {
    if (!companyId) return
    try {
      const list = await getCustomersAutocomplete({
        companyId,
        search: guarantorSearch,
      })
      setGuarantorOptions(list)
    } catch {
      setGuarantorOptions([])
    }
  }, [companyId, guarantorSearch])

  useEffect(() => {
    if (!companyId) return
    const t = setTimeout(fetchGuarantorOptions, 300)
    return () => clearTimeout(t)
  }, [companyId, guarantorSearch, fetchGuarantorOptions])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (autocompleteRef.current && !autocompleteRef.current.contains(target)) {
        setShowAutocomplete(false)
      }
      if (guarantorRef.current && !guarantorRef.current.contains(target)) {
        setShowGuarantorDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isFieldDisabled = (field: string): boolean => {
    if (readOnly) return true
    return disabledFields?.has(field) ?? false
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (readOnly) return
    if (!companyId) {
      setError('Empresa não configurada.')
      return
    }
    const customerId = selectedCustomer?.id ?? form.customer_id
    if (!customerId) {
      setError('Selecione um cliente.')
      return
    }
    const isActive = form.status_id === CONTRACT_STATUS.ACTIVE
    if (isActive) {
      if (!form.first_due_date?.trim()) {
        setError('Data de vencimento é obrigatória para contrato Ativo.')
        return
      }
      const amountForValidation = form.contract_amount ? parseFloat(form.contract_amount.replace(',', '.')) : 0
      const nForValidation = parseInt(form.installments_count, 10) || 0
      if (!amountForValidation || amountForValidation <= 0 || nForValidation <= 0) {
        setError('Valor de contrato e número de parcelas são obrigatórios e devem ser maiores que zero para contrato Ativo.')
        return
      }
    }
    setError(null)
    setLoading(true)
    try {
      const amount = form.contract_amount ? parseFloat(form.contract_amount.replace(',', '.')) : null
      const n = Math.max(1, parseInt(form.installments_count, 10) || 12)
      const interestPercent = form.interest_rate ? parseFloat(form.interest_rate.replace(',', '.')) : 0
      const adminFeePercent = form.admin_fee_rate ? parseFloat(form.admin_fee_rate.replace(',', '.')) : 0
      const installmentAmount =
        amount != null && amount > 0
          ? calcularParcela(amount, n, interestPercent, adminFeePercent).parcela
          : null
      const totalAmount = form.valor_financiado ? parseFloat(form.valor_financiado.replace(',', '.')) : amount ?? null
      const adminFee = form.admin_fee_rate ? parseFloat(form.admin_fee_rate.replace(',', '.')) : null
      const interest = form.interest_rate ? parseFloat(form.interest_rate.replace(',', '.')) : null
      const notesWithSub =
        form.tipo === CONTRACT_CATEGORY.FINANCING && form.financiamento_sub
          ? [form.notes, `Financiamento (${form.financiamento_sub === 'caixa' ? 'Caixa' : 'Aprovado'})`].filter(Boolean).join(' | ')
          : form.notes

      if (mode === 'edit' && contractId && companyId) {
        await updateContract(contractId, companyId, {
          customer_id: customerId,
          guarantor_customer_id: selectedGuarantor?.id ?? null,
          contract_number: form.contract_number || null,
          inclusion_date: form.inclusion_date || null,
          contract_amount: amount,
          installments_count: parseInt(form.installments_count, 10) || 12,
          contract_category_id: form.tipo,
          contract_type_id: CONTRACT_TYPE.PRICE,
          status_id: form.status_id,
          first_due_date: form.first_due_date || null,
          installment_amount: installmentAmount,
          total_amount: totalAmount ?? amount ?? undefined,
          bank: form.bank.trim() || null,
          admin_fee_rate: adminFee ?? null,
          interest_rate: interest ?? null,
          notes: notesWithSub.trim() || null,
        })
      } else {
        await insertContract({
          company_id: companyId,
          customer_id: customerId,
          guarantor_customer_id: selectedGuarantor?.id ?? null,
          contract_number: form.contract_number || null,
          inclusion_date: form.inclusion_date || null,
          contract_amount: amount,
          installments_count: parseInt(form.installments_count, 10) || 12,
          contract_category_id: form.tipo,
          contract_type_id: CONTRACT_TYPE.PRICE,
          status_id: form.status_id,
          first_due_date: form.first_due_date || null,
          installment_amount: installmentAmount,
          total_amount: totalAmount ?? amount ?? undefined,
          bank: form.bank.trim() || null,
          admin_fee_rate: adminFee ?? null,
          interest_rate: interest ?? null,
          notes: notesWithSub.trim() || null,
        })
      }
      router.push('/contratos')
      router.refresh()
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : mode === 'edit'
            ? 'Erro ao atualizar contrato.'
            : 'Erro ao criar contrato.'
      )
    } finally {
      setLoading(false)
    }
  }

  const isEdit = mode === 'edit'

  // Preview de parcelas calculadas em tempo real ("12 parcelas de R$ 396,00")
  const parcelasPreview = useMemo(() => {
    const valor = parseFloat((form.contract_amount || '').replace(',', '.')) || 0
    const n = Math.max(1, parseInt(form.installments_count, 10) || 0) || 0
    const taxa = parseFloat((form.interest_rate || '').replace(',', '.')) || 0
    const admin = parseFloat((form.admin_fee_rate || '').replace(',', '.')) || 0
    if (valor <= 0 || n <= 0) return null
    const { parcela, total } = calcularParcela(valor, n, taxa, admin)
    return { count: n, parcela, total }
  }, [form.contract_amount, form.installments_count, form.interest_rate, form.admin_fee_rate])

  // Geração de PDF direto do form (modo edit)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const handleGeneratePdf = useCallback(async () => {
    if (!isEdit || !contractId || !companyId) return
    setPdfLoading(true)
    setPdfError(null)
    try {
      const contract = await getContractById(contractId, companyId)
      if (!contract) throw new Error('Contrato não encontrado.')
      const customer = await getCustomerById(contract.customer_id)
      if (!customer) throw new Error('Cliente não encontrado.')
      const address = customer.address_id ? await getAddressById(customer.address_id) : null
      const installments = await getInstallmentsByContract(contractId)
      await generateContractPdf({ contract, customer, address, installments })
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'Erro ao gerar PDF.')
    } finally {
      setPdfLoading(false)
    }
  }, [isEdit, contractId, companyId])

  const pageTitleText = isEdit ? 'Editar Contrato' : 'Novo Contrato de Confissão de Dívida'
  const pageSubtitleText = isEdit
    ? 'Atualize os dados do contrato'
    : 'Selecione o cliente e preencha os dados do contrato'
  const submitLabel = loading
    ? 'Salvando...'
    : isEdit
      ? 'Salvar alterações'
      : 'Salvar contrato'

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
        <h1 className={pageTitle}>{pageTitleText}</h1>
        <p className="mt-2 text-amber-600">Configure sua empresa (company_users) para criar contratos.</p>
        <Link href="/contratos" className="mt-4 inline-block text-[#1E3A8A] hover:underline">
          Voltar para Contratos
        </Link>
      </div>
    )
  }

  const isFinanciamento = form.tipo === CONTRACT_CATEGORY.FINANCING

  return (
    <div className="p-6">
      {/* Header compacto: título + ação secundária */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <MdDescription className="h-6 w-6 text-[#1E3A8A]" aria-hidden />
            <h1 className={pageTitle}>{pageTitleText}</h1>
          </div>
          <p className={pageSubtitle + ' mt-1'}>{pageSubtitleText}</p>
        </div>
        {!isEdit && (
          <Link href="/cadastrar-cliente" className="shrink-0">
            <Button type="button" variant="secondary">
              Cadastrar Novo Cliente
            </Button>
          </Link>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {/* Card: Cliente */}
        <section className={card + ' p-5 sm:p-6'}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#57636C] mb-4">Cliente</h2>
          <div ref={autocompleteRef} className="space-y-2">
            {!selectedCustomer ? (
              <div className="relative">
                <MdSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#57636C]" aria-hidden />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    const v = e.target.value
                    setCustomerSearch(v)
                    setShowAutocomplete(v.trim().length > 0)
                  }}
                  onFocus={() => customerSearch.trim() && setShowAutocomplete(true)}
                  placeholder="Buscar por nome ou CPF/CNPJ"
                  className={input + ' pl-12'}
                  aria-label="Buscar cliente"
                  disabled={isFieldDisabled('customer_id')}
                />
                {showAutocomplete && customerSearch.trim().length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-[8px] border border-[#E0E3E7] bg-white py-1 shadow-lg" role="listbox">
                    {customerOptions.length === 0 ? (
                      <li className="px-4 py-3" role="presentation">
                        <p className="text-sm text-[#57636C] mb-3">Nenhum cliente encontrado</p>
                        <Link
                          href="/cadastrar-cliente"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-[8px] border border-[#1E3A8A] bg-white px-3 py-2 text-sm font-medium text-[#1E3A8A] hover:bg-[#f1f4f8] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:ring-offset-2"
                        >
                          Cadastrar novo cliente
                        </Link>
                      </li>
                    ) : (
                      customerOptions.map((opt) => {
                        const isPJ = opt.person_type === 'juridica'
                        const displayName = isPJ ? (opt.legal_name ?? opt.label) : (opt.full_name ?? opt.label)
                        const displayDoc = isPJ ? formatCNPJ(opt.cnpj) : formatCPF(opt.cpf)
                        return (
                          <li key={opt.id}>
                            <button
                              type="button"
                              role="option"
                              className="w-full px-4 py-2 text-left text-sm text-[#0f1419] hover:bg-[#f1f4f8]"
                              onClick={() => {
                                setSelectedCustomer(opt)
                                setForm((f) => ({ ...f, customer_id: opt.id }))
                                setCustomerSearch('')
                                setShowAutocomplete(false)
                              }}
                            >
                              <span className="block font-medium">{displayName}</span>
                              <span className="block text-xs text-[#57636C]">{displayDoc}</span>
                            </button>
                          </li>
                        )
                      })
                    )}
                  </ul>
                )}
              </div>
            ) : (
              <div className="flex items-stretch gap-3">
                <div className="flex flex-1 flex-col justify-center rounded-[8px] border border-[#E0E3E7] bg-[#f1f4f8] px-4 py-3">
                  <span className="text-sm font-medium text-[#0f1419]">
                    {getCustomerDisplayName(selectedCustomer)}
                  </span>
                  <span className="mt-0.5 text-xs text-[#57636C]">
                    {selectedCustomer.person_type === 'juridica'
                      ? formatCNPJ(selectedCustomer.cnpj)
                      : formatCPF(selectedCustomer.cpf)}
                  </span>
                </div>
                {!isFieldDisabled('customer_id') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null)
                      setCustomerSearch('')
                      setForm((f) => ({ ...f, customer_id: '' }))
                    }}
                    className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[8px] bg-[#1E3A8A] text-white hover:bg-[#1e40af] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:ring-offset-2"
                    title="Trocar cliente"
                    aria-label="Trocar cliente"
                  >
                    <MdSwapHoriz className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Card: Fiador (opcional) */}
        <section className={card + ' p-5 sm:p-6'}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#57636C] mb-4">
            Fiador <span className="font-normal normal-case text-[#57636C]">(opcional)</span>
          </h2>
          <div ref={guarantorRef} className="space-y-2">
            {!selectedGuarantor ? (
              <div className="relative">
                <MdSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#57636C]" aria-hidden />
                <input
                  type="text"
                  value={guarantorSearch}
                  onChange={(e) => {
                    const v = e.target.value
                    setGuarantorSearch(v)
                    setShowGuarantorDropdown(v.trim().length > 0)
                  }}
                  onFocus={() => guarantorSearch.trim() && setShowGuarantorDropdown(true)}
                  placeholder="Buscar fiador por nome ou CPF/CNPJ"
                  className={input + ' pl-12'}
                  aria-label="Buscar fiador"
                  disabled={isFieldDisabled('guarantor')}
                />
                {showGuarantorDropdown && guarantorSearch.trim().length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-[8px] border border-[#E0E3E7] bg-white py-1 shadow-lg" role="listbox">
                    {guarantorOptions.length === 0 ? (
                      <li className="px-4 py-3" role="presentation">
                        <p className="text-sm text-[#57636C] mb-3">Nenhum fiador encontrado</p>
                        <Link
                          href="/cadastrar-cliente"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-[8px] border border-[#1E3A8A] bg-white px-3 py-2 text-sm font-medium text-[#1E3A8A] hover:bg-[#f1f4f8] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:ring-offset-2"
                        >
                          Cadastrar novo fiador
                        </Link>
                      </li>
                    ) : (
                      guarantorOptions.map((opt) => {
                        const isPJ = opt.person_type === 'juridica'
                        const displayName = isPJ ? (opt.legal_name ?? opt.label) : (opt.full_name ?? opt.label)
                        const displayDoc = isPJ ? formatCNPJ(opt.cnpj) : formatCPF(opt.cpf)
                        return (
                          <li key={opt.id}>
                            <button
                              type="button"
                              role="option"
                              className="w-full px-4 py-2 text-left text-sm text-[#0f1419] hover:bg-[#f1f4f8]"
                              onClick={() => {
                                setSelectedGuarantor(opt)
                                setGuarantorSearch('')
                                setShowGuarantorDropdown(false)
                              }}
                            >
                              <span className="block font-medium">{displayName}</span>
                              <span className="block text-xs text-[#57636C]">{displayDoc}</span>
                            </button>
                          </li>
                        )
                      })
                    )}
                  </ul>
                )}
              </div>
            ) : (
              <div className="flex items-stretch gap-3">
                <div className="flex flex-1 flex-col justify-center rounded-[8px] border border-[#E0E3E7] bg-[#f1f4f8] px-4 py-3">
                  <span className="text-sm font-medium text-[#0f1419]">
                    {getCustomerDisplayName(selectedGuarantor)}
                  </span>
                  <span className="mt-0.5 text-xs text-[#57636C]">
                    {selectedGuarantor.person_type === 'juridica'
                      ? formatCNPJ(selectedGuarantor.cnpj)
                      : formatCPF(selectedGuarantor.cpf)}
                  </span>
                </div>
                {!isFieldDisabled('guarantor') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGuarantor(null)
                      setGuarantorSearch('')
                    }}
                    className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[8px] bg-[#1E3A8A] text-white hover:bg-[#1e40af] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:ring-offset-2"
                    title="Remover fiador"
                    aria-label="Remover fiador"
                  >
                    <MdSwapHoriz className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Card: Dados do contrato */}
        <section className={card + ' p-5 sm:p-6'}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#57636C] mb-4">Dados do contrato</h2>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Número do contrato *</label>
                <input
                  type="text"
                  value={form.contract_number}
                  onChange={(e) => setForm((f) => ({ ...f, contract_number: e.target.value }))}
                  placeholder="Gerando..."
                  className={input}
                  readOnly={mode === 'create'}
                  disabled={isFieldDisabled('contract_number')}
                />
              </div>
              <div>
                <label className={label}>Data de inclusão *</label>
                <input
                  type="date"
                  value={form.inclusion_date}
                  onChange={(e) => setForm((f) => ({ ...f, inclusion_date: e.target.value }))}
                  className={input}
                  disabled={isFieldDisabled('inclusion_date')}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={label}>Valor do contrato *</label>
                <CurrencyInput
                  value={form.contract_amount}
                  onChange={(v) => setForm((f) => ({ ...f, contract_amount: v }))}
                  disabled={isFieldDisabled('contract_amount')}
                />
              </div>
              <div>
                <label className={label}>Número de parcelas *</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.installments_count}
                    onChange={(e) => setForm((f) => ({ ...f, installments_count: e.target.value }))}
                    placeholder="Ex.: 12"
                    className={input + (parcelasPreview ? ' pr-32' : '')}
                    disabled={isFieldDisabled('installments_count')}
                  />
                  {parcelasPreview && (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[#1E3A8A]">
                      × {formatCurrency(parcelasPreview.parcela)}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className={label}>Data do 1º vencimento *</label>
                <input
                  type="date"
                  value={form.first_due_date}
                  onChange={(e) => setForm((f) => ({ ...f, first_due_date: e.target.value }))}
                  className={input}
                  disabled={isFieldDisabled('first_due_date')}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Taxa administrativa (%)</label>
                <div className="flex rounded-[8px] border border-[#e5e7eb] bg-white focus-within:border-[#1E3A8A] focus-within:ring-2 focus-within:ring-[#1E3A8A]/20">
                  <span className="flex h-[42px] items-center pl-3 text-sm text-[#57636C]">%</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.admin_fee_rate}
                    onChange={(e) => setForm((f) => ({ ...f, admin_fee_rate: e.target.value }))}
                    placeholder="0,00"
                    className="h-[42px] flex-1 rounded-r-[8px] border-0 bg-transparent px-3 py-2.5 text-sm text-[#0f1419] placeholder:text-[#94a3b8] focus:outline-none"
                    disabled={isFieldDisabled('admin_fee_rate')}
                  />
                </div>
              </div>
              <div>
                <label className={label}>Taxa de juros (% a.m.)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.interest_rate}
                  onChange={(e) => setForm((f) => ({ ...f, interest_rate: e.target.value }))}
                  placeholder="Ex.: 1,5"
                  className={input}
                  disabled={isFieldDisabled('interest_rate')}
                />
              </div>
            </div>
            {parcelasPreview ? (
              <div className="rounded-[8px] border border-blue-200 bg-blue-50 px-4 py-3">
                <p className="text-sm font-medium text-[#0f1419]">
                  <span className="text-[#1E3A8A]">{parcelasPreview.count} parcelas</span> de{' '}
                  <span className="text-[#1E3A8A]">{formatCurrency(parcelasPreview.parcela)}</span>
                </p>
                <p className="mt-0.5 text-xs text-[#536471]">
                  Valor total: {formatCurrency(parcelasPreview.total)}
                  {parcelasPreview.total !== parcelasPreview.parcela * parcelasPreview.count
                    ? ''
                    : ''}
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#57636C]">
                Preencha valor do contrato e número de parcelas para ver o cálculo automático.
                Se houver taxa de juros, é aplicada na fórmula (PMT).
              </p>
            )}
            {!readOnly && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSimulacaoOpen(true)}
                className="w-full sm:w-auto"
              >
                Abrir simulação detalhada
              </Button>
            )}
          </div>
        </section>

        {/* Card: Tipo e status */}
        <section className={card + ' p-5 sm:p-6'}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#57636C] mb-4">Tipo e status</h2>
          <div className="space-y-4">
            <div>
              <label className={label}>Tipo do contrato</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: Number(e.target.value) }))}
                className={input}
                disabled={isFieldDisabled('tipo')}
              >
                {TIPO_OPCOES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {isFinanciamento && (
              <div className="rounded-[8px] border border-[#E0E3E7] bg-[#f8fafc] p-4 space-y-4">
                <div className="flex flex-wrap gap-4">
                  {FINANCIAMENTO_OPCOES.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="financiamento_sub"
                        value={opt.value}
                        checked={form.financiamento_sub === opt.value}
                        onChange={() => setForm((f) => ({ ...f, financiamento_sub: opt.value }))}
                        className="rounded-full border-[#E0E3E7] text-[#1E3A8A] focus:ring-[#1E3A8A]"
                        disabled={isFieldDisabled('financiamento_sub')}
                      />
                      <span className="text-sm text-[#0f1419]">{opt.label}</span>
                    </label>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={label}>Banco</label>
                    <input
                      type="text"
                      value={form.bank}
                      onChange={(e) => setForm((f) => ({ ...f, bank: e.target.value }))}
                      className={input}
                      placeholder="Nome do banco"
                      disabled={isFieldDisabled('bank')}
                    />
                  </div>
                  <div>
                    <label className={label}>Valor financiado</label>
                    <CurrencyInput
                      value={form.valor_financiado}
                      onChange={(v) => setForm((f) => ({ ...f, valor_financiado: v }))}
                      disabled={isFieldDisabled('valor_financiado')}
                    />
                  </div>
                </div>
              </div>
            )}
            <div>
              <label className={label}>Status do contrato</label>
              <select
                value={form.status_id}
                onChange={(e) => setForm((f) => ({ ...f, status_id: Number(e.target.value) }))}
                className={input}
                disabled={isFieldDisabled('status_id')}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ul className="mt-2 space-y-1 text-xs text-[#57636C]">
                <li>
                  <strong className="text-[#0f1419]">Rascunho:</strong> contrato em preenchimento.
                  Não gera parcelas no sistema e pode ser editado livremente. Útil enquanto o acordo
                  com o cliente ainda está sendo negociado.
                </li>
                <li>
                  <strong className="text-[#0f1419]">Ativo:</strong> contrato efetivado. Ao salvar,
                  o sistema gera automaticamente as parcelas a partir do 1º vencimento e elas
                  passam a aparecer no extrato financeiro.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Card: Informações adicionais */}
        <section className={card + ' p-5 sm:p-6'}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#57636C] mb-4">
            Informações adicionais{' '}
            <span className="font-normal normal-case text-[#57636C]">(opcional)</span>
          </h2>
          <p className="mb-4 text-xs text-[#57636C]">
            Campos que não afetam o cálculo do contrato, mas ficam registrados para consulta
            interna (histórico do contrato, referência de cheque, recibo etc.).
          </p>
          <div className="space-y-4">
            <div>
              <label className={label}>Valor de título</label>
              <div className="flex rounded-[8px] border border-[#e5e7eb] bg-white focus-within:border-[#1E3A8A] focus-within:ring-2 focus-within:ring-[#1E3A8A]/20">
                <span className="flex h-[42px] items-center pl-3 text-sm text-[#57636C]">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.valor_titulo}
                  onChange={(e) => setForm((f) => ({ ...f, valor_titulo: e.target.value }))}
                  placeholder="0,00"
                  className="h-[42px] flex-1 rounded-r-[8px] border-0 bg-transparent px-3 py-2.5 text-sm text-[#0f1419] placeholder:text-[#94a3b8] focus:outline-none"
                  disabled={isFieldDisabled('valor_titulo')}
                />
              </div>
              <p className="mt-1 text-xs text-[#57636C]">
                Valor de face do título que originou a dívida (ex.: cheque, nota promissória,
                duplicata). Informativo — não substitui o valor do contrato.
              </p>
            </div>
            <div>
              <label className={label}>Observações internas</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                placeholder="Ex.: cliente pediu emissão em nome do cônjuge; entregou cópia do RG em 12/03."
                className={input + ' min-h-[80px] resize-y'}
                disabled={isFieldDisabled('notes')}
              />
              <p className="mt-1 text-xs text-[#57636C]">
                Anotações livres para a equipe — <strong>não</strong> aparecem no PDF do
                contrato enviado ao cliente.
              </p>
            </div>
          </div>
        </section>

        {pdfError && (
          <div
            className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
            role="alert"
          >
            {pdfError}
          </div>
        )}

        {/* Barra de ações */}
        {!readOnly && (
          <div className={card + ' flex flex-wrap items-center justify-end gap-3 p-4'}>
            <Link href="/contratos">
              <Button type="button" variant="secondary">
                Voltar
              </Button>
            </Link>
            {isEdit && contractId && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleGeneratePdf}
                disabled={pdfLoading}
                className="inline-flex items-center gap-2"
              >
                <MdPictureAsPdf className="h-4 w-4" aria-hidden />
                {pdfLoading ? 'Gerando PDF...' : 'Gerar e baixar PDF'}
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {submitLabel}
            </Button>
          </div>
        )}
      </form>

      <PopupSimulacao
        open={simulacaoOpen}
        onClose={() => setSimulacaoOpen(false)}
        customer={selectedCustomer ?? undefined}
        initialValor={form.contract_amount}
        initialParcelas={form.installments_count}
        initialTaxa={form.interest_rate}
        initialAdminFee={form.admin_fee_rate}
        initialFirstDueDate={form.first_due_date || undefined}
        onApply={(v) => {
          setForm((f) => ({
            ...f,
            contract_amount: v.valor,
            installments_count: v.parcelas,
            first_due_date: v.firstDueDate,
            interest_rate: v.taxa,
            admin_fee_rate: v.adminFee,
          }))
          setSimulacaoOpen(false)
        }}
      />
    </div>
  )
}
