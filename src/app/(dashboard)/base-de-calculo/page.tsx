'use client'

import { Button, Input, LoadingScreen } from '@/components/ui'
import { useHeader } from '@/contexts/header-context'
import { getCustomersAutocomplete, type CustomerAutocompleteItem } from '@/lib/supabase/customers'
import { insertContract } from '@/lib/supabase/contracts'
import { useCompanyId } from '@/hooks/use-company-id'
import { CONTRACT_CATEGORY, CONTRACT_STATUS } from '@/types/enums'
import { CONTRACT_TYPE } from '@/types/enums'
import { formatCPFOrCNPJ } from '@/lib/format'
import { card, input, label as labelClass, pageSubtitle, buttonPrimary, buttonSecondary } from '@/lib/design'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MdArrowBack, MdSearch } from 'react-icons/md'
import { parseCurrency, maskCurrency } from '@/lib/format'

type TipoDadosContrato = 'cheque' | 'nota'

const sectionTitleClass = 'mb-4 text-sm font-semibold uppercase tracking-wide text-[#57636C]'

export default function BaseDeCalculoPage() {
  const router = useRouter()
  const { setTitle, setBreadcrumb } = useHeader()
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()

  useEffect(() => {
    setTitle('Base de Cálculo')
    setBreadcrumb([{ label: 'Home', href: '/home' }, { label: 'Contratos', href: '/contratos' }, { label: 'Base de Cálculo' }])
    return () => { setTitle(''); setBreadcrumb([]) }
  }, [setTitle, setBreadcrumb])

  const [customerSearch, setCustomerSearch] = useState('')
  const [customerOptions, setCustomerOptions] = useState<CustomerAutocompleteItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerAutocompleteItem | null>(null)
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const autocompleteRef = useRef<HTMLDivElement>(null)

  const [tipoDadosContrato, setTipoDadosContrato] = useState<TipoDadosContrato>('cheque')
  const [fone, setFone] = useState('')
  const [cel, setCel] = useState('')
  const [com, setCom] = useState('')
  const [banco, setBanco] = useState('')
  const [baseCalculo, setBaseCalculo] = useState('')
  const [valor, setValor] = useState('')
  const [taxa, setTaxa] = useState('')
  const [primeiroVencimento, setPrimeiroVencimento] = useState('')
  const [parcelas, setParcelas] = useState('12')
  const [taxaJuros, setTaxaJuros] = useState('')
  const [valorTotal, setValorTotal] = useState('')
  const [valorParcela, setValorParcela] = useState('')
  const [custodia, setCustodia] = useState('')
  const [valorCustodia, setValorCustodia] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCustomers = useCallback(async () => {
    if (!companyId) return
    try {
      const list = await getCustomersAutocomplete({ companyId, search: customerSearch })
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) {
      setError('Empresa não configurada.')
      return
    }
    if (!selectedCustomer?.id) {
      setError('Selecione um cliente.')
      return
    }
    const amount = parseCurrency(valor)
    const total = parseCurrency(valorTotal) ?? amount
    const parcelasN = Math.max(1, parseInt(parcelas, 10) || 12)
    const valorParcelaN = parseCurrency(valorParcela)
    if (!primeiroVencimento.trim()) {
      setError('Informe o primeiro vencimento.')
      return
    }
    if (!amount || amount <= 0) {
      setError('Informe o valor do contrato.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const notesParts = [
        tipoDadosContrato === 'cheque' ? 'Cheque' : 'Nota Promissória',
        custodia.trim() ? `Custódia: ${custodia}` : null,
        valorCustodia.trim() ? `Valor custódia: ${valorCustodia}` : null,
      ].filter(Boolean)
      const notes = notesParts.length ? notesParts.join(' | ') : null

      await insertContract({
        company_id: companyId,
        customer_id: selectedCustomer.id,
        contract_number: baseCalculo.trim() || null,
        inclusion_date: new Date().toISOString().split('T')[0],
        contract_amount: amount,
        installments_count: parcelasN,
        admin_fee_rate: parseCurrency(taxa) ?? null,
        interest_rate: parseCurrency(taxaJuros) ?? null,
        first_due_date: primeiroVencimento.trim() || null,
        total_amount: total,
        installment_amount: valorParcelaN ?? total / parcelasN,
        bank: banco.trim() || null,
        contract_category_id: CONTRACT_CATEGORY.LOAN,
        contract_type_id: CONTRACT_TYPE.PRICE,
        status_id: CONTRACT_STATUS.DRAFT,
        notes,
      })
      router.push('/contratos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar contrato.')
    } finally {
      setLoading(false)
    }
  }

  if (companyLoading) return <LoadingScreen message="Carregando..." />
  if (companyError || !companyId) {
    return (
      <div className="p-6">
        <p className="text-amber-600">Configure sua empresa para acessar esta tela.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <p className={pageSubtitle}>Preencha os dados do cliente e do contrato</p>
        <Link
          href="/contratos"
          className={buttonSecondary + ' inline-flex items-center gap-2'}
        >
          <MdArrowBack className="h-5 w-5" />
          Voltar
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className={card + ' p-6'}>
          <h2 className={sectionTitleClass}>
            Cliente
          </h2>
          <div className="relative" ref={autocompleteRef}>
            <label className={labelClass}>Selecionar cliente</label>
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#57636C]" />
              <input
                type="text"
                className={input + ' pl-10'}
                placeholder="Buscar por nome ou documento"
                value={selectedCustomer ? (selectedCustomer.full_name ?? selectedCustomer.legal_name ?? selectedCustomer.label) : customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value)
                  if (!e.target.value) setSelectedCustomer(null)
                  setShowAutocomplete(true)
                }}
                onFocus={() => setShowAutocomplete(true)}
              />
            </div>
            {showAutocomplete && (
              <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-[8px] border border-[#E0E3E7] bg-white py-1 shadow-lg">
                {customerOptions.length === 0 && (
                  <li className="px-3 py-2 text-sm text-[#57636C]">Nenhum cliente encontrado</li>
                )}
                {customerOptions.map((c) => (
                  <li
                    key={c.id}
                    className="cursor-pointer px-3 py-2 text-sm hover:bg-[#f1f4f8]"
                    onClick={() => {
                      setSelectedCustomer(c)
                      setCustomerSearch('')
                      setShowAutocomplete(false)
                    }}
                  >
                    {c.full_name ?? c.legal_name ?? c.label} –{' '}
                    {formatCPFOrCNPJ(c.cpf ?? null, c.cnpj ?? null)}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {selectedCustomer && (
            <p className="mt-2 text-xs text-[#57636C]">
              CPF/CNPJ: {formatCPFOrCNPJ(selectedCustomer.cpf ?? null, selectedCustomer.cnpj ?? null)}
            </p>
          )}
        </div>

        <div className={card + ' p-6'}>
          <h2 className={sectionTitleClass}>
            Dados do contrato
          </h2>
          <div className="flex gap-6">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="tipoDados"
                checked={tipoDadosContrato === 'cheque'}
                onChange={() => setTipoDadosContrato('cheque')}
                className="h-4 w-4 border-[#E0E3E7] text-[#1E3A8A] focus:ring-[#1E3A8A]"
              />
              <span className="text-sm text-[#14181B]">Cheque</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="tipoDados"
                checked={tipoDadosContrato === 'nota'}
                onChange={() => setTipoDadosContrato('nota')}
                className="h-4 w-4 border-[#E0E3E7] text-[#1E3A8A] focus:ring-[#1E3A8A]"
              />
              <span className="text-sm text-[#14181B]">Nota Promissória</span>
            </label>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass}>Fone</label>
              <Input
                value={fone}
                onChange={(e) => setFone(e.target.value)}
                placeholder="(00) 0000-0000"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Cel</label>
              <Input
                value={cel}
                onChange={(e) => setCel(e.target.value)}
                placeholder="(00) 00000-0000"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Com</label>
              <Input
                value={com}
                onChange={(e) => setCom(e.target.value)}
                placeholder="Comercial"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Banco</label>
              <Input
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                placeholder="Nome do banco"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Base de cálculo (código)</label>
              <Input
                value={baseCalculo}
                onChange={(e) => setBaseCalculo(e.target.value)}
                placeholder="Ex.: LCMO02598"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Valor</label>
              <Input
                value={valor}
                onChange={(e) => setValor(maskCurrency(e.target.value))}
                placeholder="0,00"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Taxa (%)</label>
              <Input
                value={taxa}
                onChange={(e) => setTaxa(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="5,00"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Primeiro vencimento</label>
              <Input
                type="date"
                value={primeiroVencimento}
                onChange={(e) => setPrimeiroVencimento(e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Parcelas</label>
              <Input
                type="number"
                min={1}
                value={parcelas}
                onChange={(e) => setParcelas(e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Taxa de juros (%)</label>
              <Input
                value={taxaJuros}
                onChange={(e) => setTaxaJuros(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="0,00"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Valor total</label>
              <Input
                value={valorTotal}
                onChange={(e) => setValorTotal(maskCurrency(e.target.value))}
                placeholder="0,00"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Valor por parcela</label>
              <Input
                value={valorParcela}
                onChange={(e) => setValorParcela(maskCurrency(e.target.value))}
                placeholder="0,00"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Custódia</label>
              <Input
                value={custodia}
                onChange={(e) => setCustodia(e.target.value)}
                placeholder="Descrição"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Valor (custódia)</label>
              <Input
                value={valorCustodia}
                onChange={(e) => setValorCustodia(maskCurrency(e.target.value))}
                placeholder="0,00"
                className={input}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/contratos" className={buttonSecondary}>
            Cancelar
          </Link>
          <Button type="submit" disabled={loading} className={buttonPrimary}>
            {loading ? 'Salvando...' : 'Salvar contrato'}
          </Button>
        </div>
      </form>
    </div>
  )
}
