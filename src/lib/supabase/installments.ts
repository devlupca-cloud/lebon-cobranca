import { createClient } from '@/lib/supabase/client'
import { INSTALLMENT_STATUS } from '@/types/enums'

/** Dados aninhados do contrato (nome da relação pode ser "contracts" ou "contract" no Supabase). */
type ContractRelation = {
  contract_number: string | null
  customer_id: string
  customers: { full_name: string | null } | null
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
 * Considera inadimplente quando due_date < hoje e amount_paid < amount.
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
        customers (
          full_name
        )
      )
    `
    )
    .eq('company_id', companyId)
    .is('deleted_at', null)
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
