'use client'

import { Button, Input, LoadingScreen } from '@/components/ui'
import { getCustomersAutocomplete, type CustomerAutocompleteItem } from '@/lib/supabase/customers'
import { insertContract } from '@/lib/supabase/contracts'
import { useCompanyId } from '@/hooks/use-company-id'
import { CONTRACT_CATEGORY, CONTRACT_STATUS } from '@/types/enums'
import { CONTRACT_TYPE } from '@/types/enums'
import { formatCPFOrCNPJ } from '@/lib/format'
import { card, input, label as labelClass, pageTitle, pageSubtitle, buttonPrimary, buttonSecondary } from '@/lib/design'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MdArrowBack, MdSearch } from 'react-icons/md'
import { parseCurrency, maskCurrency } from '@/lib/format'

type TipoFinanciamento = 'caixa' | 'aprovado'

export default function FinanciamentoPage() {
  const router = useRouter()
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()

  const [customerSearch, setCustomerSearch] = useState('')
  const [customerOptions, setCustomerOptions] = useState<CustomerAutocompleteItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerAutocompleteItem | null>(null)
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const autocompleteRef = useRef<HTMLDivElement>(null)

  const [tipoFinanciamento, setTipoFinanciamento] = useState<TipoFinanciamento>('caixa')
  const [fone, setFone] = useState('')
  const [cel, setCel] = useState('')
  const [com, setCom] = useState('')
  const [taxa, setTaxa] = useState('')
  const [cpf, setCpf] = useState('')
  const [banco, setBanco] = useState('')
  const [valorFinanciado, setValorFinanciado] = useState('')
  const [baseCodigo, setBaseCodigo] = useState('')
  const [taxaPercent, setTaxaPercent] = useState('')
  const [parcelaSugerida, setParcelaSugerida] = useState('')
  const [primeiroVencimento, setPrimeiroVencimento] = useState('')
  const [valorTotal, setValorTotal] = useState('')
  const [valorParcela, setValorParcela] = useState('')
  const [residuo, setResiduo] = useState('')
  const [totalParcelas, setTotalParcelas] = useState('12')
  const [valorExtra1, setValorExtra1] = useState('')
  const [valorExtra2, setValorExtra2] = useState('')
  const [ajuste, setAjuste] = useState('')

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
    const amount = parseCurrency(valorFinanciado)
    const total = parseCurrency(valorTotal) ?? amount
    const parcelasN = Math.max(1, parseInt(totalParcelas, 10) || 12)
    const valorParcelaN = parseCurrency(valorParcela)
    if (!primeiroVencimento.trim()) {
      setError('Informe o primeiro vencimento.')
      return
    }
    if (!amount || amount <= 0) {
      setError('Informe o valor financiado.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const notes = tipoFinanciamento === 'caixa' ? 'Financiamento (Caixa)' : 'Financiamento Aprovado'

      await insertContract({
        company_id: companyId,
        customer_id: selectedCustomer.id,
        contract_number: baseCodigo.trim() || null,
        inclusion_date: new Date().toISOString().split('T')[0],
        contract_amount: amount,
        installments_count: parcelasN,
        admin_fee_rate: parseCurrency(taxa) ?? parseCurrency(taxaPercent) ?? null,
        interest_rate: parseCurrency(taxaPercent) ?? null,
        first_due_date: primeiroVencimento.trim() || null,
        total_amount: total,
        installment_amount: valorParcelaN ?? total / parcelasN,
        residual_amount: parseCurrency(residuo) ?? null,
        total_installments: parcelasN,
        bank: banco.trim() || null,
        contract_category_id: CONTRACT_CATEGORY.FINANCING,
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
        <h1 className={pageTitle}>Financiamento</h1>
        <p className="mt-2 text-amber-600">Configure sua empresa para acessar esta tela.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className={pageTitle}>Novo contrato de financiamento</h1>
          <p className={pageSubtitle}>Preencha os dados do cliente e do financiamento</p>
        </div>
        <Link href="/contratos" className={buttonSecondary + ' inline-flex items-center gap-2'}>
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
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#57636C]">Cliente</h2>
          <div className="relative" ref={autocompleteRef}>
            <label className={labelClass}>Selecionar cliente</label>
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#57636C]" />
              <input
                type="text"
                className={input + ' pl-10'}
                placeholder="Buscar por nome ou documento"
                value={
                  selectedCustomer
                    ? selectedCustomer.full_name ?? selectedCustomer.legal_name ?? selectedCustomer.label
                    : customerSearch
                }
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
                    {c.full_name ?? c.legal_name ?? c.label} – {formatCPFOrCNPJ(c.cpf ?? null, c.cnpj ?? null)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className={card + ' p-6'}>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#57636C]">
            Dados do contrato
          </h2>
          <div className="mb-6 flex gap-6">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="tipoFin"
                checked={tipoFinanciamento === 'caixa'}
                onChange={() => setTipoFinanciamento('caixa')}
                className="h-4 w-4 text-[#1E3A8A] focus:ring-[#1E3A8A]"
              />
              <span className="text-sm text-[#14181B]">Financiamento (Caixa)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="tipoFin"
                checked={tipoFinanciamento === 'aprovado'}
                onChange={() => setTipoFinanciamento('aprovado')}
                className="h-4 w-4 text-[#1E3A8A] focus:ring-[#1E3A8A]"
              />
              <span className="text-sm text-[#14181B]">Financiamento Aprovado</span>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass}>Fone</label>
              <Input value={fone} onChange={(e) => setFone(e.target.value)} placeholder="(00) 0000-0000" className={input} />
            </div>
            <div>
              <label className={labelClass}>Cel</label>
              <Input value={cel} onChange={(e) => setCel(e.target.value)} placeholder="(00) 00000-0000" className={input} />
            </div>
            <div>
              <label className={labelClass}>Com</label>
              <Input value={com} onChange={(e) => setCom(e.target.value)} placeholder="Comercial" className={input} />
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
              <label className={labelClass}>CPF</label>
              <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="CPF" className={input} />
            </div>
            <div>
              <label className={labelClass}>Banco</label>
              <Input value={banco} onChange={(e) => setBanco(e.target.value)} placeholder="Nome do banco" className={input} />
            </div>
            <div>
              <label className={labelClass}>Valor financiado</label>
              <Input
                value={valorFinanciado}
                onChange={(e) => setValorFinanciado(maskCurrency(e.target.value))}
                placeholder="0,00"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Código (base)</label>
              <Input value={baseCodigo} onChange={(e) => setBaseCodigo(e.target.value)} placeholder="LCMO..." className={input} />
            </div>
            <div>
              <label className={labelClass}>Taxa (%)</label>
              <Input
                value={taxaPercent}
                onChange={(e) => setTaxaPercent(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="5,00"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Parcela sugerida</label>
              <Input
                value={parcelaSugerida}
                onChange={(e) => setParcelaSugerida(maskCurrency(e.target.value))}
                placeholder="0,00"
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
              <label className={labelClass}>Resíduo</label>
              <Input
                value={residuo}
                onChange={(e) => setResiduo(maskCurrency(e.target.value))}
                placeholder="0,00"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Total de parcelas</label>
              <Input
                type="number"
                min={1}
                value={totalParcelas}
                onChange={(e) => setTotalParcelas(e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Valor</label>
              <Input
                value={valorExtra1}
                onChange={(e) => setValorExtra1(maskCurrency(e.target.value))}
                placeholder="0,00"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Valor</label>
              <Input
                value={valorExtra2}
                onChange={(e) => setValorExtra2(maskCurrency(e.target.value))}
                placeholder="0,00"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Ajuste</label>
              <Input
                value={ajuste}
                onChange={(e) => setAjuste(maskCurrency(e.target.value))}
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
