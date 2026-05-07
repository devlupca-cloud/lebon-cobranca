import { createClient } from '@/lib/supabase/client'
import { INSTALLMENT_STATUS } from '@/types/enums'

/** Dados aninhados do contrato (nome da relação pode ser "contracts" ou "contract" no Supabase). */
export type ContractRelation = {
  contract_number: string | null
  customer_id: string
  contract_amount: number | null
  installment_amount: number | null
  installments_count?: number
  total_installments?: number | null
  /** Resposta da API com hint customer_id (alias: customer) */
  customer?: {
    full_name: string | null
    legal_name: string | null
    cpf: string | null
    cnpj: string | null
    person_type?: string
  } | null
  /** Nome antigo da relação (PostgREST sem hint) */
  customers?: {
    full_name: string | null
    legal_name: string | null
    cpf: string | null
    cnpj: string | null
    person_type?: string
  } | null
}

/** Parcela vencida com dados do contrato e do cliente (para tela Inadimplentes). */
export type OverdueInstallmentRow = {
  id: string
  contract_id: string
  company_id: string
  installment_number: number
  due_date: string
  amount: number
  amount_paid: number
  paid_at: string | null
  status_id: number
  notes: string | null
  contracts?: ContractRelation | null
  contract?: ContractRelation | null
}

/**
 * Busca parcelas vencidas (due_date < hoje e não quitadas) da empresa.
 * Considera inadimplente quando due_date < hoje, amount_paid < amount e a
 * parcela está ativa (status OPEN/PARTIAL/OVERDUE). Renegociadas, pagas
 * e canceladas são excluídas.
 */
export async function getOverdueInstallments(
  companyId: string
): Promise<OverdueInstallmentRow[]> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('contract_installments')
    .select(
      `
      id,
      contract_id,
      company_id,
      installment_number,
      due_date,
      amount,
      amount_paid,
      paid_at,
      status_id,
      notes,
      contracts (
        contract_number,
        customer_id,
        contract_amount,
        installment_amount,
        installments_count,
        total_installments,
        customer:customers!customer_id (
          full_name,
          legal_name,
          cpf,
          cnpj,
          person_type
        )
      )
    `
    )
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .in('status_id', [
      INSTALLMENT_STATUS.OPEN,
      INSTALLMENT_STATUS.PARTIAL,
      INSTALLMENT_STATUS.OVERDUE,
    ])
    .lt('due_date', today)
    .order('due_date', { ascending: true })

  if (error) throw error

  const rows = (data ?? []) as unknown as OverdueInstallmentRow[]

  // Apenas parcelas não quitadas (valor em aberto)
  return rows.filter((r) => r.amount_paid < r.amount)
}

// ──────────────────────────── Update installment ──────────────────

export type UpdateInstallmentInput = {
  due_date?: string
  notes?: string | null
  amount?: number
}

export async function updateInstallment(
  installmentId: string,
  companyId: string,
  input: UpdateInstallmentInput
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('contract_installments')
    .update(input)
    .eq('id', installmentId)
    .eq('company_id', companyId)
    .is('deleted_at', null)

  if (error) throw error
}

// ──────────────────────────── Cancel installment ──────────────────

export async function cancelInstallment(
  installmentId: string,
  companyId: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('contract_installments')
    .update({ status_id: INSTALLMENT_STATUS.CANCELED })
    .eq('id', installmentId)
    .eq('company_id', companyId)
    .is('deleted_at', null)

  if (error) throw error
}

// ──────────────────────────── Renegotiation agreement ────────────

export type NewAgreementInstallment = {
  due_date: string
  amount: number
}

export type AgreementType = 'amigavel' | 'juridico'

export type CreateAgreementInput = {
  companyId: string
  contractId: string
  originalInstallmentIds: string[]
  newInstallments: NewAgreementInstallment[]
  agreementType: AgreementType
  /** Obrigatorio quando agreementType = 'juridico'. */
  processNumber?: string | null
  /** Total do acordo (soma das novas parcelas). Se NULL, RPC calcula. */
  totalAmount?: number | null
  /** Valor de cada parcela do acordo. Se NULL, RPC calcula. */
  installmentAmount?: number | null
  /** Primeira data de vencimento. Se NULL, RPC pega da primeira parcela. */
  firstDueDate?: string | null
  /** Juros simulados no acordo (informativo). */
  interestRate?: number | null
  /** Taxa admin simulada (informativo). */
  adminFeeRate?: number | null
  notes?: string | null
}

export type CreateAgreementResult = {
  old_contract_id: string
  new_contract_id: string
  new_contract_number: string
  agreement_type: AgreementType
  process_number: string | null
  renegotiated_ids: string[]
  new_installment_ids: string[]
  new_count: number
}

/**
 * Cria acordo de renegociacao em CONTRATO NOVO separado (v2).
 *
 * - Marca o contrato antigo como RENEGOTIATED (status 5) e suas parcelas
 *   selecionadas com status 6 (RENEGOTIATED).
 * - Cria contrato novo com `original_contract_id` apontando pro antigo,
 *   `agreement_type` e (se juridico) `process_number`.
 * - Insere novas parcelas no contrato NOVO com origin RENEGOTIATION.
 * - Recalcula `outstanding_balance` do cliente.
 */
export async function createAgreement(
  input: CreateAgreementInput
): Promise<CreateAgreementResult> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('create_renegotiation_agreement', {
    p_company_id: input.companyId,
    p_contract_id: input.contractId,
    p_original_installment_ids: input.originalInstallmentIds,
    p_new_installments: input.newInstallments,
    p_agreement_type: input.agreementType,
    p_process_number: input.processNumber ?? null,
    p_total_amount: input.totalAmount ?? null,
    p_installment_amount: input.installmentAmount ?? null,
    p_first_due_date: input.firstDueDate ?? null,
    p_interest_rate: input.interestRate ?? null,
    p_admin_fee_rate: input.adminFeeRate ?? null,
    p_notes: input.notes ?? null,
  })

  if (error) throw new Error(error.message)
  return data as CreateAgreementResult
}

// ──────────────────────────── Overdue by contract ────────────────

/**
 * Retorna parcelas em aberto/atraso/parcial de UM contrato — base para o
 * modal de acordo. Não filtra por due_date (o usuário pode incluir parcelas
 * a vencer também, se for o caso de quitação antecipada).
 */
export async function getOpenInstallmentsByContract(
  contractId: string,
  companyId: string
): Promise<OverdueInstallmentRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('contract_installments')
    .select(
      `
      id,
      contract_id,
      company_id,
      installment_number,
      due_date,
      amount,
      amount_paid,
      paid_at,
      status_id,
      notes
    `
    )
    .eq('contract_id', contractId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .in('status_id', [
      INSTALLMENT_STATUS.OPEN,
      INSTALLMENT_STATUS.PARTIAL,
      INSTALLMENT_STATUS.OVERDUE,
    ])
    .order('installment_number', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as OverdueInstallmentRow[]
}
