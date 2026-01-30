import { createClient } from '@/lib/supabase/client'

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

  const rows = (data ?? []) as OverdueInstallmentRow[]

  // Apenas parcelas não quitadas (valor em aberto)
  return rows.filter((r) => r.amount_paid < r.amount)
}
