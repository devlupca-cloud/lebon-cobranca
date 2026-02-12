'use client'

import { Button } from '@/components/ui'
import { LoadingScreen } from '@/components/ui'
import { PopupQuitacao } from '@/components/popup-quitacao'
import { PopupGerarPdf } from '@/components/popup-gerar-pdf'
import {
  getContractById,
  getInstallmentsByContract,
  activateContract,
  updateContract,
  deleteContract,
} from '@/lib/supabase/contracts'
import { useCompanyId } from '@/hooks/use-company-id'
import { CONTRACT_STATUS, INSTALLMENT_STATUS } from '@/types/enums'
import { formatCPFOrCNPJ } from '@/lib/format'
import {
  pageTitle,
  pageSubtitle,
  card,
  tableHead,
  tableCell,
  tableCellMuted,
} from '@/lib/design'
import type { ContractWithRelations, ContractInstallment } from '@/types/database'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import {
  MdDescription,
  MdEdit,
  MdReceipt,
  MdPlayArrow,
  MdCancel,
  MdDelete,
  MdArrowBack,
} from 'react-icons/md'

const STATUS_LABELS: Record<number, string> = {
  [CONTRACT_STATUS.DRAFT]: 'Rascunho',
  [CONTRACT_STATUS.ACTIVE]: 'Ativo',
  [CONTRACT_STATUS.CLOSED]: 'Encerrado',
  [CONTRACT_STATUS.CANCELED]: 'Cancelado',
}

const STATUS_BADGE_CLASS: Record<number, string> = {
  [CONTRACT_STATUS.DRAFT]: 'bg-[#E0E3E7] text-[#14181B]',
  [CONTRACT_STATUS.ACTIVE]: 'bg-[#249689]/15 text-[#249689]',
  [CONTRACT_STATUS.CLOSED]: 'bg-[#14181B] text-white',
  [CONTRACT_STATUS.CANCELED]: 'bg-red-100 text-red-700',
}

const INSTALLMENT_STATUS_LABELS: Record<number, string> = {
  [INSTALLMENT_STATUS.OPEN]: 'Em aberto',
  [INSTALLMENT_STATUS.PARTIAL]: 'Parcial',
  [INSTALLMENT_STATUS.PAID]: 'Pago',
  [INSTALLMENT_STATUS.OVERDUE]: 'Vencida',
  [INSTALLMENT_STATUS.CANCELED]: 'Cancelada',
  [INSTALLMENT_STATUS.RENEGOTIATED]: 'Renegociada',
}

const INSTALLMENT_STATUS_CLASS: Record<number, string> = {
  [INSTALLMENT_STATUS.OPEN]: 'bg-blue-100 text-blue-700',
  [INSTALLMENT_STATUS.PARTIAL]: 'bg-amber-100 text-amber-700',
  [INSTALLMENT_STATUS.PAID]: 'bg-[#249689]/15 text-[#249689]',
  [INSTALLMENT_STATUS.OVERDUE]: 'bg-red-100 text-red-700',
  [INSTALLMENT_STATUS.CANCELED]: 'bg-[#E0E3E7] text-[#57636C]',
  [INSTALLMENT_STATUS.RENEGOTIATED]: 'bg-purple-100 text-purple-700',
}

const CATEGORY_LABELS: Record<number, string> = {
  1: 'Financiamento',
  2: 'Base de Cálculo',
  3: 'Cheque',
}

function formatCurrency(value: number | null) {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value + 'T00:00:00').toLocaleDateString('pt-BR')
}

export default function DetalhesContratoPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : null
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()

  const [contract, setContract] = useState<ContractWithRelations | null>(null)
  const [installments, setInstallments] = useState<ContractInstallment[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [quitacaoOpen, setQuitacaoOpen] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'delete' | null>(null)

  const loadData = useCallback(async () => {
    if (!id || !companyId) return
    setLoading(true)
    setNotFound(false)
    try {
      const [contractData, installmentsData] = await Promise.all([
        getContractById(id, companyId),
        getInstallmentsByContract(id),
      ])
      if (!contractData) {
        setNotFound(true)
        return
      }
      setContract(contractData)
      setInstallments(installmentsData)
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [id, companyId])

  useEffect(() => {
    if (companyId && id) loadData()
  }, [companyId, id, loadData])

  async function handleActivate() {
    if (!id || !companyId) return
    setActionLoading(true)
    setActionError(null)
    try {
      await activateContract(id, companyId)
      await loadData()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erro ao ativar contrato.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCancel() {
    if (!id || !companyId) return
    setActionLoading(true)
    setActionError(null)
    try {
      await updateContract(id, companyId, { status_id: CONTRACT_STATUS.CANCELED })
      await loadData()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erro ao cancelar contrato.')
    } finally {
      setActionLoading(false)
      setConfirmAction(null)
    }
  }

  async function handleDelete() {
    if (!id || !companyId) return
    setActionLoading(true)
    setActionError(null)
    try {
      await deleteContract(id, companyId)
      router.push('/contratos')
      router.refresh()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erro ao excluir contrato.')
      setActionLoading(false)
      setConfirmAction(null)
    }
  }

  if (companyLoading || loading) return <LoadingScreen message="Carregando contrato..." />

  if (companyError || !companyId) {
    return (
      <div className="p-6">
        <h1 className={pageTitle}>Detalhes do Contrato</h1>
        <p className="mt-2 text-amber-600">Configure sua empresa (company_users) para visualizar contratos.</p>
      </div>
    )
  }

  if (notFound || !contract) {
    return (
      <div className="p-6">
        <h1 className={pageTitle}>Detalhes do Contrato</h1>
        <p className="mt-2 text-amber-600">Contrato não encontrado.</p>
        <Link href="/contratos" className="mt-4 inline-block text-[#1E3A8A] hover:underline">
          Voltar para Contratos
        </Link>
      </div>
    )
  }

  const statusId = contract.status_id
  const statusLabel = STATUS_LABELS[statusId] ?? contract.status?.name ?? '—'
  const statusClass = STATUS_BADGE_CLASS[statusId] ?? 'bg-[#E0E3E7] text-[#14181B]'
  const isDraft = statusId === CONTRACT_STATUS.DRAFT
  const isActive = statusId === CONTRACT_STATUS.ACTIVE
  const canEdit = isDraft || isActive

  return (
    <div className="flex flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/contratos" className="text-[#57636C] hover:text-[#1E3A8A]" title="Voltar">
              <MdArrowBack className="h-5 w-5" />
            </Link>
            <MdDescription className="h-6 w-6 text-[#1E3A8A]" aria-hidden />
            <h1 className={pageTitle}>
              Contrato {contract.contract_number ?? contract.id.slice(0, 8)}
            </h1>
            <span className={'inline-flex rounded-[8px] px-2.5 py-0.5 text-xs font-medium ' + statusClass}>
              {statusLabel}
            </span>
          </div>
          <p className={pageSubtitle + ' mt-1'}>
            {contract.customer?.full_name ?? '—'}
            {contract.customer?.cpf || contract.customer?.cnpj
              ? ` — ${formatCPFOrCNPJ(contract.customer.cpf ?? null, contract.customer.cnpj ?? null)}`
              : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Link href={`/editar-contrato/${contract.id}`}>
              <Button type="button" variant="secondary">
                <MdEdit className="h-4 w-4" />
                Editar
              </Button>
            </Link>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setPdfOpen(true)}
          >
            <MdDescription className="h-4 w-4" />
            Gerar PDF
          </Button>
          {isActive && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setQuitacaoOpen(true)}
            >
              <MdReceipt className="h-4 w-4" />
              Quitação
            </Button>
          )}
          {isDraft && (
            <Button
              type="button"
              variant="primary"
              onClick={handleActivate}
              disabled={actionLoading}
            >
              <MdPlayArrow className="h-4 w-4" />
              {actionLoading ? 'Ativando...' : 'Ativar Contrato'}
            </Button>
          )}
          {(isDraft || isActive) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmAction('cancel')}
              disabled={actionLoading}
            >
              <MdCancel className="h-4 w-4" />
              Cancelar
            </Button>
          )}
          {isDraft && (
            <button
              type="button"
              onClick={() => setConfirmAction('delete')}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 rounded-[8px] border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              <MdDelete className="h-4 w-4" />
              Excluir
            </button>
          )}
        </div>
      </div>

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="mb-4 rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">
            {confirmAction === 'cancel'
              ? 'Tem certeza que deseja cancelar este contrato?'
              : 'Tem certeza que deseja excluir este contrato?'}
          </p>
          <p className="mt-1 text-xs">
            {confirmAction === 'cancel'
              ? 'O contrato será marcado como cancelado e não poderá mais ser editado.'
              : 'O contrato será removido permanentemente da listagem.'}
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="primary"
              onClick={confirmAction === 'cancel' ? handleCancel : handleDelete}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processando...' : 'Confirmar'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmAction(null)}
              disabled={actionLoading}
            >
              Voltar
            </Button>
          </div>
        </div>
      )}

      {actionError && (
        <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {actionError}
        </div>
      )}

      {/* Card: Dados do contrato */}
      <div className={card + ' mb-6 p-5 sm:p-6'}>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#57636C]">
          Dados do contrato
        </h2>
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Cliente" value={contract.customer?.full_name ?? '—'} />
          <InfoItem label="CPF/CNPJ" value={formatCPFOrCNPJ(contract.customer?.cpf ?? null, contract.customer?.cnpj ?? null)} />
          <InfoItem label="Fiador" value={contract.guarantor?.full_name ?? 'Sem fiador'} />
          <InfoItem label="Valor do contrato" value={formatCurrency(contract.contract_amount)} highlight />
          <InfoItem label="Parcelas" value={`${contract.installments_count}x de ${formatCurrency(contract.installment_amount)}`} />
          <InfoItem label="Taxa de juros" value={contract.interest_rate ? `${String(contract.interest_rate).replace('.', ',')}% a.m.` : '—'} />
          <InfoItem label="Taxa administrativa" value={contract.admin_fee_rate ? formatCurrency(contract.admin_fee_rate) : '—'} />
          <InfoItem label="Tipo" value={CATEGORY_LABELS[contract.contract_category_id] ?? '—'} />
          <InfoItem label="Banco" value={contract.bank ?? '—'} />
          <InfoItem label="Data de inclusão" value={formatDate(contract.inclusion_date)} />
          <InfoItem label="1º Vencimento" value={formatDate(contract.first_due_date)} />
          <InfoItem label="Valor total" value={formatCurrency(contract.total_amount)} />
        </div>
        {contract.notes && (
          <div className="mt-4 border-t border-[#E0E3E7] pt-4">
            <p className="text-xs font-medium text-[#57636C]">Observações</p>
            <p className="mt-1 text-sm text-[#0f1419] whitespace-pre-wrap">{contract.notes}</p>
          </div>
        )}
      </div>

      {/* Card: Parcelas */}
      {installments.length > 0 && (
        <div className={card}>
          <div className="px-5 py-4 sm:px-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#57636C]">
              Parcelas ({installments.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E0E3E7]">
              <thead>
                <tr>
                  <th className={tableHead}>N°</th>
                  <th className={tableHead}>Vencimento</th>
                  <th className={tableHead}>Valor</th>
                  <th className={tableHead}>Pago</th>
                  <th className={tableHead}>Saldo</th>
                  <th className={tableHead}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E3E7] bg-white">
                {installments.map((inst) => {
                  const saldo = inst.amount - inst.amount_paid
                  const instStatusLabel = INSTALLMENT_STATUS_LABELS[inst.status_id] ?? '—'
                  const instStatusClass = INSTALLMENT_STATUS_CLASS[inst.status_id] ?? 'bg-[#E0E3E7] text-[#14181B]'
                  return (
                    <tr key={inst.id} className="hover:bg-[#f1f4f8]/50">
                      <td className={tableCell + ' font-medium'}>{inst.installment_number}</td>
                      <td className={tableCellMuted}>{formatDate(inst.due_date)}</td>
                      <td className={tableCell}>{formatCurrency(inst.amount)}</td>
                      <td className={tableCell}>{formatCurrency(inst.amount_paid)}</td>
                      <td className={tableCell}>
                        <span className={saldo > 0 ? 'text-red-600 font-medium' : 'text-[#249689] font-medium'}>
                          {formatCurrency(saldo)}
                        </span>
                      </td>
                      <td className={tableCell}>
                        <span className={'inline-flex rounded-[8px] px-2.5 py-0.5 text-xs font-medium ' + instStatusClass}>
                          {instStatusLabel}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {installments.length === 0 && !isDraft && (
        <div className={card + ' p-5 text-center text-sm text-[#57636C]'}>
          Nenhuma parcela encontrada para este contrato.
        </div>
      )}

      {isDraft && installments.length === 0 && (
        <div className={card + ' p-5 text-center text-sm text-[#57636C]'}>
          Este contrato é um rascunho. As parcelas serão geradas ao ativar o contrato.
        </div>
      )}

      <PopupQuitacao
        open={quitacaoOpen}
        onClose={() => setQuitacaoOpen(false)}
        contractId={id}
        companyId={companyId}
        onSuccess={loadData}
      />
      <PopupGerarPdf
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        contractId={id}
      />
    </div>
  )
}

function InfoItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-[#57636C]">{label}</p>
      <p className={`mt-0.5 text-sm ${highlight ? 'font-semibold text-[#1E3A8A]' : 'text-[#0f1419]'}`}>
        {value}
      </p>
    </div>
  )
}
