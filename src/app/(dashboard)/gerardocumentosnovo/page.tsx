'use client'

import { Button } from '@/components/ui'
import { LoadingScreen } from '@/components/ui'
import { useHeader } from '@/contexts/header-context'
import { useCompanyId } from '@/hooks/use-company-id'
import {
  getContractsFiltered,
  getContractById,
  getInstallmentsByContract,
} from '@/lib/supabase/contracts'
import { getCustomerById, getAddressById } from '@/lib/supabase/customers'
import { generateContractPdf } from '@/lib/pdf/contract-pdf'
import { generateQuitacaoPdf } from '@/lib/pdf/quitacao-pdf'
import { generateAnuenciaPdf } from '@/lib/pdf/anuencia-pdf'
import { generateFichaCadastralPdf } from '@/lib/pdf/ficha-cadastral-pdf'
import { CONTRACT_STATUS } from '@/types/enums'
import { formatCPFOrCNPJ } from '@/lib/format'
import { buttonPrimary, buttonSecondary, card, input, label as labelClass, pageSubtitle } from '@/lib/design'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ContractWithRelations } from '@/types/database'
import { MdDescription, MdDownload, MdPrint, MdVisibility } from 'react-icons/md'

const DOC_TYPES = [
  { id: 'confissao', label: 'Contrato de Confissão de Dívida', description: 'Documento principal do contrato com todos os dados do cliente e fiador' },
  { id: 'carta_anuencia', label: 'Carta de Anuência', description: 'Necessária para processo de cobrança junto ao cartório' },
  { id: 'carta_quitacao', label: 'Carta de Quitação', description: 'Carta para retirada de protestos' },
  { id: 'ficha_cadastral', label: 'Ficha Cadastral', description: 'Relatório completo com dados do cliente e fiador' },
] as const

type DocTypeId = (typeof DOC_TYPES)[number]['id']

function getCustomerDisplayName(customer: ContractWithRelations['customer']): string {
  if (!customer) return '—'
  const name = [customer.full_name, customer.trade_name, customer.legal_name].find(
    (s) => s != null && String(s).trim() !== ''
  )
  if (name?.trim()) return String(name).trim()
  const doc = formatCPFOrCNPJ(customer.cpf ?? null, customer.cnpj ?? null)
  return doc !== '—' ? doc : '—'
}

function formatGeneratedAt(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

type GeneratedDoc = {
  blob: Blob
  filename: string
  contractNumber: string
  clientName: string
  cpfCnpj: string
  docTypeLabel: string
  generatedAt: Date
}

export default function GerarDocumentosPage() {
  const { setTitle, setBreadcrumb } = useHeader()
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()
  const [contractsAll, setContractsAll] = useState<ContractWithRelations[]>([])

  useEffect(() => {
    setTitle('Gerar Documentos')
    setBreadcrumb([{ label: 'Home', href: '/home' }, { label: 'Gerar Documentos' }])
    return () => {
      setTitle('')
      setBreadcrumb([])
    }
  }, [setTitle, setBreadcrumb])
  const [contractsClosed, setContractsClosed] = useState<ContractWithRelations[]>([])
  const [loadingContracts, setLoadingContracts] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedContractId, setSelectedContractId] = useState<string>('')
  const [selectedDocType, setSelectedDocType] = useState<DocTypeId>('confissao')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [generatedDoc, setGeneratedDoc] = useState<GeneratedDoc | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const contractsForSelect =
    selectedDocType === 'carta_quitacao' ? contractsClosed : contractsAll
  const selectedContract = contractsAll.find((c) => c.id === selectedContractId) ??
    contractsClosed.find((c) => c.id === selectedContractId)
  const selectedDocTypeInfo = DOC_TYPES.find((d) => d.id === selectedDocType)

  const fetchContracts = useCallback(async () => {
    if (!companyId) return
    setLoadingContracts(true)
    setError(null)
    try {
      const [resAll, resClosed] = await Promise.all([
        getContractsFiltered({ companyId, limit: 200, offset: 0 }),
        getContractsFiltered({
          companyId,
          statusId: CONTRACT_STATUS.CLOSED,
          limit: 200,
          offset: 0,
        }),
      ])
      setContractsAll(resAll.data ?? [])
      setContractsClosed(resClosed.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar contratos.')
    } finally {
      setLoadingContracts(false)
    }
  }, [companyId])

  useEffect(() => {
    if (!companyId) return
    fetchContracts()
  }, [companyId, fetchContracts])

  // Quando trocar o tipo para Carta de Quitação, limpar contrato se o atual não estiver na lista de encerrados
  useEffect(() => {
    if (selectedDocType === 'carta_quitacao' && selectedContractId) {
      const inClosed = contractsClosed.some((c) => c.id === selectedContractId)
      if (!inClosed) setSelectedContractId('')
    }
  }, [selectedDocType, selectedContractId, contractsClosed])

  const handleGerar = useCallback(async () => {
    if (!companyId || !selectedContractId || !selectedDocTypeInfo) return

    setGenerating(true)
    setGenError(null)
    setGeneratedDoc(null)
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }

    try {
      const contract = await getContractById(selectedContractId, companyId)
      if (!contract) {
        setGenError('Contrato não encontrado.')
        return
      }
      const customer = await getCustomerById(contract.customer_id)
      if (!customer) {
        setGenError('Cliente não encontrado.')
        return
      }

      const clientName = getCustomerDisplayName(
        customer as unknown as ContractWithRelations['customer']
      )
      const cpfCnpj = formatCPFOrCNPJ(customer.cpf ?? null, customer.cnpj ?? null)
      const contractNum = contract.contract_number ?? '—'

      if (selectedDocType === 'confissao') {
        const address = customer.address_id ? await getAddressById(customer.address_id) : null
        const installments = await getInstallmentsByContract(selectedContractId)
        const result = generateContractPdf(
          { contract, customer, address, installments },
          { returnBlob: true }
        )
        if (result && 'blob' in result) {
          setGeneratedDoc({
            blob: result.blob,
            filename: result.filename,
            contractNumber: contractNum,
            clientName,
            cpfCnpj,
            docTypeLabel: selectedDocTypeInfo.label,
            generatedAt: new Date(),
          })
        }
        return
      }

      if (selectedDocType === 'carta_quitacao') {
        const customerName =
          [customer.full_name, customer.trade_name, customer.legal_name].find((s) => s?.trim())?.trim() ??
          cpfCnpj
        const result = generateQuitacaoPdf(
          { contract, customerName },
          { returnBlob: true }
        )
        if (result && 'blob' in result) {
          setGeneratedDoc({
            blob: result.blob,
            filename: result.filename,
            contractNumber: contractNum,
            clientName,
            cpfCnpj,
            docTypeLabel: selectedDocTypeInfo.label,
            generatedAt: new Date(),
          })
        }
        return
      }

      if (selectedDocType === 'carta_anuencia') {
        const result = generateAnuenciaPdf(
          { contract, customerName: clientName, customerDoc: cpfCnpj },
          { returnBlob: true }
        )
        if (result && 'blob' in result) {
          setGeneratedDoc({
            blob: result.blob,
            filename: result.filename,
            contractNumber: contractNum,
            clientName,
            cpfCnpj,
            docTypeLabel: selectedDocTypeInfo.label,
            generatedAt: new Date(),
          })
        }
        return
      }

      if (selectedDocType === 'ficha_cadastral') {
        const customerAddress = customer.address_id
          ? await getAddressById(customer.address_id)
          : null
        let guarantor: Awaited<ReturnType<typeof getCustomerById>> = null
        let guarantorAddress: Awaited<ReturnType<typeof getAddressById>> = null
        if (contract.guarantor_customer_id) {
          guarantor = await getCustomerById(contract.guarantor_customer_id)
          if (guarantor?.address_id) {
            guarantorAddress = await getAddressById(guarantor.address_id)
          }
        }
        const result = generateFichaCadastralPdf(
          {
            contract,
            customer,
            customerAddress,
            guarantor,
            guarantorAddress,
          },
          { returnBlob: true }
        )
        if (result && 'blob' in result) {
          setGeneratedDoc({
            blob: result.blob,
            filename: result.filename,
            contractNumber: contractNum,
            clientName,
            cpfCnpj,
            docTypeLabel: selectedDocTypeInfo.label,
            generatedAt: new Date(),
          })
        }
        return
      }

      setGenError('Tipo de documento não implementado.')
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Erro ao gerar documento.')
    } finally {
      setGenerating(false)
    }
  }, [companyId, selectedContractId, selectedDocType, selectedDocTypeInfo])

  const handleDownload = useCallback(() => {
    if (!generatedDoc) return
    const url = URL.createObjectURL(generatedDoc.blob)
    objectUrlRef.current = url
    const a = document.createElement('a')
    a.href = url
    a.download = generatedDoc.filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 200)
    objectUrlRef.current = null
  }, [generatedDoc])

  const handleVisualizar = useCallback(() => {
    if (!generatedDoc) return
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url = URL.createObjectURL(generatedDoc.blob)
    objectUrlRef.current = url
    // Usar <a target="_blank"> evita bloqueio de pop-up e funciona melhor com blob URL
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
    // Não revogar aqui: a nova aba precisa do URL para exibir o PDF
  }, [generatedDoc])

  const handleImprimir = useCallback(() => {
    if (!generatedDoc) return
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url = URL.createObjectURL(generatedDoc.blob)
    objectUrlRef.current = url
    const w = window.open(url, '_blank', 'noopener,noreferrer')
    if (w) {
      // O viewer de PDF pode demorar a carregar; aguardar antes de abrir o print
      setTimeout(() => {
        try {
          w.focus()
          w.print()
        } catch {
          // Fallback: usuário pode imprimir pela aba (Ctrl+P)
        }
      }, 1500)
    }
    // Não revogar aqui: a janela precisa do URL para exibir e imprimir
  }, [generatedDoc])

  if (companyLoading || (companyId && loadingContracts)) {
    return <LoadingScreen />
  }

  if (companyError) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">{companyError.message}</p>
      </div>
    )
  }

  if (!companyId) return null

  // Fluxo: 1) Ver resultado OU 2) Escolher documento → contrato → gerar
  const showSuccess = !!generatedDoc

  return (
    <div className="p-6">
      <p className={pageSubtitle}>
        Escolha o tipo de documento e o contrato para gerar o PDF
      </p>

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Resultado em destaque quando há documento gerado */}
      {showSuccess && (
        <div
          className="mt-6 rounded-[8px] border border-[#249689]/40 bg-[#ecfdf5] p-6 shadow-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#249689]">
                Documento gerado
              </h2>
              <p className="mt-1 text-sm text-[#57636C]">
                {generatedDoc!.docTypeLabel} · Contrato {generatedDoc!.contractNumber} – {generatedDoc!.clientName}
              </p>
              <p className="mt-0.5 text-xs text-[#57636C]">
                {formatGeneratedAt(generatedDoc!.generatedAt)} · {generatedDoc!.filename}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:shrink-0">
              <Button
                type="button"
                variant="primary"
                onClick={handleDownload}
                className={buttonPrimary}
              >
                <MdDownload className="h-5 w-5" aria-hidden />
                Download
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleVisualizar}
                className={buttonSecondary}
              >
                <MdVisibility className="h-5 w-5" aria-hidden />
                Visualizar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleImprimir}
                className={buttonSecondary}
              >
                <MdPrint className="h-5 w-5" aria-hidden />
                Imprimir
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current)
                objectUrlRef.current = null
              }
              setGeneratedDoc(null)
              setGenError(null)
            }}
            className="mt-4 text-sm font-medium text-[#1E3A8A] hover:underline"
          >
            Gerar outro documento
          </button>
        </div>
      )}

      {/* Passo 1: Escolher tipo de documento (cards no topo) */}
      <section className="mt-8" aria-label="Tipo de documento">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#57636C]">
          1. Qual documento você precisa?
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {DOC_TYPES.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setSelectedDocType(d.id)
                setGenError(null)
              }}
              className={
                card +
                ' flex cursor-pointer flex-col items-start gap-2 p-4 text-left transition ' +
                (selectedDocType === d.id
                  ? 'border-[#1E3A8A] ring-2 ring-[#1E3A8A] bg-[#eff6ff]'
                  : 'hover:border-[#1E3A8A]/50 hover:bg-[#f8fafc]')
              }
            >
              <span className="font-semibold text-[#14181B]">{d.label}</span>
              <span className="text-sm text-[#57636C]">{d.description}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Passo 2: Escolher contrato + botão Gerar */}
      <section className="mt-8" aria-label="Contrato e geração">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#57636C]">
          2. Para qual contrato?
        </h2>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-4">
          <div className="min-w-0 flex-1">
            <label htmlFor="doc-contract" className={labelClass}>
              Contrato
            </label>
            <select
              id="doc-contract"
              className={input}
              value={selectedContractId}
              onChange={(e) => {
                setSelectedContractId(e.target.value)
                setGenError(null)
              }}
            >
              <option value="">
                {selectedDocType === 'carta_quitacao'
                  ? 'Selecione um contrato encerrado'
                  : 'Selecione um contrato'}
              </option>
              {contractsForSelect.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.contract_number ?? '—'} – {getCustomerDisplayName(c.customer)}
                </option>
              ))}
            </select>
            {selectedDocType === 'carta_quitacao' && (
              <p className="mt-1 text-xs text-[#57636C]">
                Apenas contratos com status Encerrado
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={handleGerar}
            disabled={generating || !selectedContractId}
            className={buttonPrimary + ' w-full shrink-0 sm:w-auto'}
          >
            <MdDescription className="h-5 w-5" aria-hidden />
            {generating ? 'Gerando...' : 'Gerar PDF'}
          </Button>
        </div>

        {selectedContractId && selectedContract && (
          <p className="mt-2 text-sm text-[#57636C]">
            Será gerado: <strong className="text-[#14181B]">{selectedDocTypeInfo?.label}</strong> do contrato{' '}
            <strong className="text-[#14181B]">{selectedContract.contract_number ?? '—'}</strong> –{' '}
            {getCustomerDisplayName(selectedContract.customer)}
          </p>
        )}

        {genError && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {genError}
          </p>
        )}
      </section>
    </div>
  )
}
