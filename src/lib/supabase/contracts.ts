import { createClient } from '@/lib/supabase/client'
import type { Contract, ContractInstallment } from '@/types/database'

export async function getContracts(companyId: string): Promise<Contract[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Contract[]
}

export async function getContractsByCustomer(
  companyId: string,
  customerId: string
): Promise<Contract[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('company_id', companyId)
    .eq('customer_id', customerId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Contract[]
}

export async function getInstallmentsByContract(
  contractId: string
): Promise<ContractInstallment[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('contract_installments')
    .select('id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, notes')
    .eq('contract_id', contractId)
    .is('deleted_at', null)
    .order('installment_number', { ascending: true })

  if (error) throw error
  return (data ?? []) as ContractInstallment[]
}

export type InsertContractInput = {
  company_id: string
  customer_id: string
  contract_number?: string | null
  inclusion_date?: string | null
  contract_amount?: number | null
  installments_count: number
  admin_fee_rate?: number | null
  interest_rate?: number | null
  first_due_date?: string | null
  total_amount?: number | null
  installment_amount?: number | null
  residual_amount?: number | null
  total_installments?: number | null
  bank?: string | null
  contract_category_id: number
  contract_type_id: number
  status_id: number
  notes?: string | null
}

export async function insertContract(
  input: InsertContractInput
): Promise<Contract> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('contracts')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data as Contract
}
