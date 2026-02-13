import { createClient } from '@/lib/supabase/client'
import type { Contract, ContractInstallment, ContractWithRelations, GetContractsResponse } from '@/types/database'
import { CONTRACT_STATUS, INSTALLMENT_STATUS, INSTALLMENT_ORIGIN } from '@/types/enums'

// ──────────────────────────── Queries ──────────────────────────────

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

export async function getContractById(
  contractId: string,
  companyId: string
): Promise<ContractWithRelations | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      *,
      customer:customers!customer_id ( id, full_name, legal_name, trade_name, cpf, cnpj, person_type ),
      guarantor:customers!guarantor_customer_id ( id, full_name, legal_name, trade_name, cpf, cnpj, person_type ),
      contract_statuses ( id, name ),
      contract_categories ( id, name ),
      contract_types ( id, name )
    `)
    .eq('id', contractId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const raw = data as Record<string, unknown>
  return {
    ...(raw as unknown as Contract),
    customer: (raw.customer ?? raw.customers) as ContractWithRelations['customer'],
    guarantor: raw.guarantor as ContractWithRelations['guarantor'],
    status: raw.contract_statuses as ContractWithRelations['status'],
    category: raw.contract_categories as ContractWithRelations['category'],
    contract_type: raw.contract_types as ContractWithRelations['contract_type'],
  }
}

export type GetContractsParams = {
  companyId: string
  limit?: number
  offset?: number
  customerId?: string | null
  statusId?: number | null
  contractNumber?: string | null
  startDate?: string | null
  endDate?: string | null
}

export async function getContractsFiltered(
  params: GetContractsParams
): Promise<GetContractsResponse> {
  const supabase = createClient()

  let query = supabase
    .from('contracts')
    .select(`
      *,
      customer:customers!inner ( id, full_name, legal_name, trade_name, cpf, cnpj, person_type ),
      contract_statuses ( id, name ),
      contract_categories ( id, name ),
      contract_types ( id, name )
    `, { count: 'exact' })
    .eq('company_id', params.companyId)
    .is('deleted_at', null)
    .is('customers.deleted_at', null)

  if (params.customerId) {
    query = query.eq('customer_id', params.customerId)
  }
  if (params.statusId) {
    query = query.eq('status_id', params.statusId)
  }
  if (params.contractNumber) {
    query = query.ilike('contract_number', `%${params.contractNumber}%`)
  }
  if (params.startDate) {
    query = query.gte('inclusion_date', params.startDate)
  }
  if (params.endDate) {
    query = query.lte('inclusion_date', params.endDate)
  }

  const limit = params.limit ?? 20
  const offset = params.offset ?? 0

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) throw error

  const rows = (data ?? []).map((raw: Record<string, unknown>) => ({
    ...(raw as unknown as Contract),
    customer: (raw.customer ?? raw.customers) as ContractWithRelations['customer'],
    status: raw.contract_statuses as ContractWithRelations['status'],
    category: raw.contract_categories as ContractWithRelations['category'],
    contract_type: raw.contract_types as ContractWithRelations['contract_type'],
  }))

  return {
    total: count ?? 0,
    limit,
    offset,
    data: rows,
  }
}

export async function getInstallmentsByContract(
  contractId: string
): Promise<ContractInstallment[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('contract_installments')
    .select('*')
    .eq('contract_id', contractId)
    .is('deleted_at', null)
    .order('installment_number', { ascending: true })

  if (error) throw error
  return (data ?? []) as ContractInstallment[]
}

// ──────────────────────────── Insert ───────────────────────────────

export type InsertContractInput = {
  company_id: string
  customer_id: string
  guarantor_customer_id?: string | null
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

  const totalAmount = input.total_amount ?? input.contract_amount ?? 0

  const { data, error } = await supabase
    .from('contracts')
    .insert({ ...input, total_amount: totalAmount })
    .select()
    .single()

  if (error) throw error

  const contract = data as Contract

  if (contract.status_id === CONTRACT_STATUS.ACTIVE) {
    await generateInstallments(contract)
  }

  return contract
}

// ──────────────────────────── Update ───────────────────────────────

export type UpdateContractInput = Partial<Omit<InsertContractInput, 'company_id'>>

export async function updateContract(
  contractId: string,
  companyId: string,
  input: UpdateContractInput
): Promise<Contract> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('contracts')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', contractId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) throw error
  return data as Contract
}

// ──────────────────────────── Delete (soft) ────────────────────────

export async function deleteContract(
  contractId: string,
  companyId: string
): Promise<void> {
  const supabase = createClient()
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('contracts')
    .update({ deleted_at: now, updated_at: now })
    .eq('id', contractId)
    .eq('company_id', companyId)

  if (error) throw error
}

// ──────────────────────────── Generate installments ────────────────

export async function generateInstallments(
  contract: Contract
): Promise<ContractInstallment[]> {
  const { id: contractId, company_id, installments_count, installment_amount, first_due_date } = contract

  if (!installments_count || installments_count <= 0) {
    throw new Error('installments_count deve ser maior que zero.')
  }
  if (!first_due_date) {
    throw new Error('first_due_date é obrigatório para gerar parcelas.')
  }

  const amount = installment_amount ?? 0
  const rows: Array<Record<string, unknown>> = []

  for (let i = 0; i < installments_count; i++) {
    const dueDate = new Date(first_due_date + 'T00:00:00')
    dueDate.setMonth(dueDate.getMonth() + i)

    rows.push({
      contract_id: contractId,
      company_id,
      installment_number: i + 1,
      due_date: dueDate.toISOString().split('T')[0],
      amount,
      amount_paid: 0,
      status_id: INSTALLMENT_STATUS.OPEN,
      origin_id: INSTALLMENT_ORIGIN.CONTRACT,
    })
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('contract_installments')
    .insert(rows)
    .select()

  if (error) throw error
  return (data ?? []) as ContractInstallment[]
}

// ──────────────────────────── Activate contract ───────────────────

export async function activateContract(
  contractId: string,
  companyId: string
): Promise<{ contract: Contract; installments: ContractInstallment[] }> {
  const contract = await updateContract(contractId, companyId, {
    status_id: CONTRACT_STATUS.ACTIVE,
  })
  const installments = await generateInstallments(contract)
  return { contract, installments }
}

// ──────────────────────────── Close contract ──────────────────────

/** Fecha o contrato se todas as parcelas ativas estiverem pagas. Uma única query de count em vez de buscar todas as parcelas. */
export async function checkAndCloseContract(
  contractId: string,
  companyId: string
): Promise<boolean> {
  const supabase = createClient()

  const { count: activeCount, error: e1 } = await supabase
    .from('contract_installments')
    .select('*', { count: 'exact', head: true })
    .eq('contract_id', contractId)
    .neq('status_id', INSTALLMENT_STATUS.CANCELED)
    .is('deleted_at', null)

  if (e1 || activeCount == null) return false

  if (activeCount === 0) return false

  const { count: paidCount, error: e2 } = await supabase
    .from('contract_installments')
    .select('*', { count: 'exact', head: true })
    .eq('contract_id', contractId)
    .eq('status_id', INSTALLMENT_STATUS.PAID)
    .is('deleted_at', null)

  if (e2 || paidCount == null) return false

  const allPaid = activeCount > 0 && activeCount === paidCount
  if (!allPaid) return false

  await updateContract(contractId, companyId, {
    status_id: CONTRACT_STATUS.CLOSED,
  })
  return true
}
