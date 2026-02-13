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

      // Carta de Anuência e Ficha Cadastral: em desenvolvimento
      setGenError('Este tipo de documento estará disponível em breve.')
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
    const url = URL.createObjectURL(generatedDoc.blob)
    objectUrlRef.current = url
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }, [generatedDoc])

  const handleImprimir = useCallback(() => {
    if (!generatedDoc) return
    const url = URL.createObjectURL(generatedDoc.blob)
    const w = window.open(url, '_blank', 'noopener,noreferrer')
    if (w) {
      w.onload = () => {
        w.print()
        w.onafterprint = () => w.close()
      }
    }
    setTimeout(() => URL.revokeObjectURL(url), 15000)
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

  return (
    <div className="p-6">
      <p className={pageSubtitle}>
        Selecione um contrato e o tipo de documento para gerar
      </p>

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="doc-contract" className={labelClass}>
            Selecionar Contrato
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
        </div>
        <div>
          <label htmlFor="doc-type" className={labelClass}>
            Tipo de Documento
          </label>
          <select
            id="doc-type"
            className={input}
            value={selectedDocType}
            onChange={(e) => {
              setSelectedDocType(e.target.value as DocTypeId)
              setGenError(null)
            }}
          >
            {DOC_TYPES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Resumo da Geração */}
      <div
        className="mt-6 rounded-[8px] border border-[#E0E3E7] p-4"
        style={{ backgroundColor: '#eff6ff' }}
      >
        <h2 className="text-sm font-semibold text-[#1E3A8A]">Resumo da Geração</h2>
        <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-3">
          <div>
            <span className="font-medium text-[#14181B]">Contrato:</span>{' '}
            <span className="text-[#57636C]">{selectedContract?.contract_number ?? '—'}</span>
          </div>
          <div>
            <span className="font-medium text-[#14181B]">Cliente:</span>{' '}
            <span className="text-[#57636C]">
              {selectedContract ? getCustomerDisplayName(selectedContract.customer) : '—'}
            </span>
          </div>
          <div>
            <span className="font-medium text-[#14181B]">Documento:</span>{' '}
            <span className="text-[#57636C]">{selectedDocTypeInfo?.label ?? '—'}</span>
          </div>
        </dl>
      </div>

      <div className="mt-6">
        <Button
          type="button"
          variant="primary"
          onClick={handleGerar}
          disabled={generating || !selectedContractId}
          className={buttonPrimary + ' w-full sm:w-auto'}
        >
          <MdDescription className="h-5 w-5" aria-hidden />
          {generating ? 'Gerando...' : 'Gerar Documento'}
        </Button>
      </div>

      {/* Cards de tipo de documento */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
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
              ' flex cursor-pointer flex-col items-start gap-2 p-5 text-left transition hover:border-[#1E3A8A] hover:shadow-md ' +
              (selectedDocType === d.id ? 'ring-2 ring-[#1E3A8A]' : '')
            }
          >
            <MdDescription className="h-6 w-6 text-[#1E3A8A]" aria-hidden />
            <span className="font-semibold text-[#14181B]">{d.label}</span>
            <span className="text-sm text-[#57636C]">{d.description}</span>
          </button>
        ))}
      </div>

      {genError && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {genError}
        </p>
      )}

      {/* Sucesso: Documento gerado */}
      {generatedDoc && (
        <div
          className="mt-8 rounded-[8px] border border-[#E0E3E7] p-6"
          style={{ backgroundColor: '#ecfdf5' }}
        >
          <h2 className="text-lg font-semibold text-[#249689]">
            Documento Gerado com Sucesso!
          </h2>
          <p className="mt-1 text-sm text-[#57636C]">
            Seu documento foi gerado e está pronto para download.
          </p>
          <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <p>
                <span className="font-medium text-[#14181B]">Contrato:</span>{' '}
                <span className="text-[#57636C]">{generatedDoc.contractNumber}</span>
              </p>
              <p>
                <span className="font-medium text-[#14181B]">Cliente:</span>{' '}
                <span className="text-[#57636C]">{generatedDoc.clientName}</span>
              </p>
              <p>
                <span className="font-medium text-[#14181B]">CPF/CNPJ:</span>{' '}
                <span className="text-[#57636C]">{generatedDoc.cpfCnpj}</span>
              </p>
            </div>
            <div className="space-y-1">
              <p>
                <span className="font-medium text-[#14181B]">Documento:</span>{' '}
                <span className="text-[#57636C]">{generatedDoc.docTypeLabel}</span>
              </p>
              <p>
                <span className="font-medium text-[#14181B]">Data de Geração:</span>{' '}
                <span className="text-[#57636C]">{formatGeneratedAt(generatedDoc.generatedAt)}</span>
              </p>
              <p>
                <span className="font-medium text-[#14181B]">Arquivo:</span>{' '}
                <span className="text-[#57636C]">{generatedDoc.filename}</span>
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
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
      )}
    </div>
  )
}
