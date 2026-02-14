import { createClient } from '@/lib/supabase/client'
import type { Customer, CustomerFromAPI, GetCustomersResponse } from '@/types/database'
import { INSTALLMENT_STATUS } from '@/types/enums'

export type GetCustomersParams = {
  companyId: string
  limit?: number
  offset?: number
  name?: string
  cpf?: string
  cnpj?: string
  statusId?: number | null
}

/**
 * Lista clientes (via RPC get_customers).
 * Importante: a RPC get_customers no Supabase DEVE filtrar por deleted_at IS NULL,
 * para que clientes com exclusão lógica não apareçam na listagem.
 */
export async function getCustomers(
  params: GetCustomersParams
): Promise<GetCustomersResponse> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_customers', {
    p_company_id: params.companyId || null,
    p_limit: params.limit ?? 20,
    p_offset: params.offset ?? 0,
    p_name: params.name || null,
    p_cpf: params.cpf || null,
    p_cnpj: params.cnpj || null,
    p_status_id: params.statusId ?? null,
  })

  if (error) throw error

  const raw = data as GetCustomersResponse | null | undefined
  if (raw && typeof raw === 'object' && Array.isArray(raw.data)) {
    return {
      total: Number(raw.total) ?? 0,
      limit: Number(raw.limit) ?? 20,
      offset: Number(raw.offset) ?? 0,
      data: raw.data as CustomerFromAPI[],
    }
  }

  return { total: 0, limit: params.limit ?? 20, offset: params.offset ?? 0, data: [] }
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  return data as Customer | null
}

export type AddressRow = {
  id: string
  street: string | null
  number: string | null
  neighbourhood: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  additional_info: string | null
}

export async function getAddressById(id: string): Promise<AddressRow | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('addresses')
    .select('id, street, number, neighbourhood, city, state, zip_code, additional_info')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as AddressRow | null
}

export type GetCustomersAutocompleteParams = {
  companyId: string
  search?: string
}

export type CustomerAutocompleteItem = {
  id: string
  label: string
  person_type: string
  full_name: string | null
  legal_name: string | null
  trade_name?: string | null
  cpf: string | null
  cnpj: string | null
}

export async function getCustomersAutocomplete(
  params: GetCustomersAutocompleteParams
): Promise<CustomerAutocompleteItem[]> {
  const supabase = createClient()

  let query = supabase
    .from('customers')
    .select('id, person_type, full_name, legal_name, trade_name, cpf, cnpj')
    .eq('company_id', params.companyId)
    .is('deleted_at', null)
    .order('full_name', { ascending: true, nullsFirst: false })
    .limit(20)

  const search = (params.search ?? '').trim()
  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,legal_name.ilike.%${search}%,cpf.ilike.%${search}%,cnpj.ilike.%${search}%`
    )
  }

  const { data, error } = await query

  if (error) throw error
  const list = (data ?? []) as {
    id: string
    person_type: string
    full_name: string | null
    legal_name: string | null
    trade_name: string | null
    cpf: string | null
    cnpj: string | null
  }[]
  return list.map((row) => {
    const isPJ = row.person_type === 'juridica'
    const label = isPJ
      ? (row.legal_name ?? row.trade_name ?? row.full_name ?? '')
      : (row.full_name ?? '')
    return {
      id: row.id,
      label: label.trim() || '—',
      person_type: row.person_type ?? 'fisica',
      full_name: row.full_name ?? null,
      legal_name: row.legal_name ?? null,
      trade_name: row.trade_name ?? null,
      cpf: row.cpf ?? null,
      cnpj: row.cnpj ?? null,
    }
  })
}

/** Exclusão lógica: define deleted_at para o cliente (apenas da company informada). */
export async function deleteCustomer(
  customerId: string,
  companyId: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('customers')
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId)
    .eq('company_id', companyId)
  if (error) throw error
}

/** Endereço para criação (tabela addresses) */
export type InsertAddressInput = {
  company_id?: string
  street?: string | null
  number?: string | null
  neighbourhood?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  additional_info?: string | null
}

export type InsertCustomerInput = {
  company_id: string
  person_type: string
  status_id: number
  full_name?: string | null
  legal_name?: string | null
  trade_name?: string | null
  cpf?: string | null
  cnpj?: string | null
  state_registration?: string | null
  email?: string | null
  phone?: string | null
  mobile?: string | null
  birth_date?: string | null
  occupation?: string | null
  referral?: string | null
  customer_code?: string | null
  credit_limit?: number | null
  outstanding_balance?: number | null
  marital_status_id?: number | null
  address?: InsertAddressInput | null
}

function hasAddressFields(addr: InsertAddressInput | null | undefined): boolean {
  if (!addr || typeof addr !== 'object') return false
  const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '') !== ''
  return s(addr.street) || s(addr.city) || s(addr.zip_code) || s(addr.number) || s(addr.neighbourhood) || s(addr.state) || s(addr.additional_info)
}

export async function insertAddress(
  address: InsertAddressInput
): Promise<{ id: string } | null> {
  const supabase = createClient()
  const row: Record<string, unknown> = {
    company_id: address.company_id,
    street: address.street ?? null,
    number: address.number ?? null,
    neighbourhood: address.neighbourhood ?? null,
    city: address.city ?? null,
    state: address.state ?? null,
    zip_code: address.zip_code ?? null,
    additional_info: address.additional_info ?? null,
  }
  const { data, error } = await supabase
    .from('addresses')
    .insert(row)
    .select('id')
    .single()
  if (error) throw error
  return data as { id: string } | null
}

export async function insertCustomer(
  customer: InsertCustomerInput
): Promise<Customer> {
  const supabase = createClient()
  let addressId: string | null = null
  if (hasAddressFields(customer.address)) {
    const inserted = await insertAddress({
      ...customer.address!,
      company_id: customer.company_id,
    })
    addressId = inserted?.id ?? null
  }
  const row: Record<string, unknown> = {
    company_id: customer.company_id,
    person_type: customer.person_type,
    status_id: customer.status_id,
    cpf: customer.cpf ?? null,
    cnpj: customer.cnpj ?? null,
    legal_name: customer.legal_name ?? null,
    trade_name: customer.trade_name ?? null,
    full_name: customer.full_name ?? null,
    state_registration: customer.state_registration ?? null,
    phone: customer.phone ?? null,
    mobile: customer.mobile ?? null,
    email: customer.email ?? null,
    birth_date: customer.birth_date ?? null,
    occupation: customer.occupation ?? null,
    referral: customer.referral ?? null,
    customer_code: customer.customer_code ?? null,
    credit_limit: customer.credit_limit ?? null,
    outstanding_balance: customer.outstanding_balance ?? null,
    marital_status_id: customer.marital_status_id ?? null,
    address_id: addressId,
  }
  const { data, error } = await supabase
    .from('customers')
    .insert(row)
    .select()
    .single()

  if (error) throw error
  return data as Customer
}

/** Para atualização, address pode vir sem company_id (é preenchido no backend). */
export type UpdateCustomerInput = Partial<Omit<InsertCustomerInput, 'company_id'>> & {
  address?: Omit<InsertAddressInput, 'company_id'> | null
}

export async function updateAddress(
  addressId: string,
  data: Omit<InsertAddressInput, 'company_id'>
): Promise<void> {
  const supabase = createClient()
  const row: Record<string, unknown> = {
    street: data.street ?? null,
    number: data.number ?? null,
    neighbourhood: data.neighbourhood ?? null,
    city: data.city ?? null,
    state: data.state ?? null,
    zip_code: data.zip_code ?? null,
    additional_info: data.additional_info ?? null,
  }
  const { error } = await supabase
    .from('addresses')
    .update(row)
    .eq('id', addressId)
  if (error) throw error
}

export async function updateCustomer(
  customerId: string,
  companyId: string,
  data: UpdateCustomerInput
): Promise<Customer> {
  const supabase = createClient()
  const existing = await getCustomerById(customerId)
  if (!existing) throw new Error('Cliente não encontrado.')
  let addressId: string | null = existing.address_id
  if (hasAddressFields(data.address)) {
    const addr = { ...data.address, company_id: companyId }
    if (existing.address_id) {
      await updateAddress(existing.address_id, addr)
    } else {
      const inserted = await insertAddress(addr)
      addressId = inserted?.id ?? null
    }
  }
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    person_type: data.person_type ?? existing.person_type,
    status_id: data.status_id ?? existing.status_id,
    cpf: data.cpf !== undefined ? data.cpf : existing.cpf,
    cnpj: data.cnpj !== undefined ? data.cnpj : existing.cnpj,
    legal_name: data.legal_name !== undefined ? data.legal_name : existing.legal_name,
    trade_name: data.trade_name !== undefined ? data.trade_name : existing.trade_name,
    full_name: data.full_name !== undefined ? data.full_name : existing.full_name,
    state_registration: data.state_registration !== undefined ? data.state_registration : existing.state_registration,
    phone: data.phone !== undefined ? data.phone : existing.phone,
    mobile: data.mobile !== undefined ? data.mobile : existing.mobile,
    email: data.email !== undefined ? data.email : existing.email,
    birth_date: data.birth_date !== undefined ? data.birth_date : existing.birth_date,
    occupation: data.occupation !== undefined ? data.occupation : existing.occupation,
    referral: data.referral !== undefined ? data.referral : existing.referral,
    customer_code: data.customer_code !== undefined ? data.customer_code : existing.customer_code,
    credit_limit: data.credit_limit !== undefined ? data.credit_limit : existing.credit_limit,
    outstanding_balance: data.outstanding_balance !== undefined ? data.outstanding_balance : existing.outstanding_balance,
    marital_status_id: data.marital_status_id !== undefined ? data.marital_status_id : existing.marital_status_id,
    address_id: addressId,
  }
  const { data: updated, error } = await supabase
    .from('customers')
    .update(row)
    .eq('id', customerId)
    .eq('company_id', companyId)
    .select()
    .single()
  if (error) throw error
  return updated as Customer
}

// ──────────────────────────── Outstanding balance ─────────────────

/**
 * Recalcula o saldo devedor do cliente: soma de (amount - amount_paid)
 * de todas as parcelas OPEN, PARTIAL ou OVERDUE de contratos ativos.
 */
export async function updateCustomerBalance(
  customerId: string,
  companyId: string
): Promise<number> {
  const supabase = createClient()

  // Get all contracts for this customer
  const { data: contracts, error: cErr } = await supabase
    .from('contracts')
    .select('id')
    .eq('customer_id', customerId)
    .eq('company_id', companyId)
    .is('deleted_at', null)

  if (cErr) throw cErr

  const contractIds = (contracts ?? []).map((c) => c.id)
  if (contractIds.length === 0) {
    await supabase
      .from('customers')
      .update({ outstanding_balance: 0, updated_at: new Date().toISOString() })
      .eq('id', customerId)
      .eq('company_id', companyId)
    return 0
  }

  // Get all non-settled installments
  const openStatuses = [
    INSTALLMENT_STATUS.OPEN,
    INSTALLMENT_STATUS.PARTIAL,
    INSTALLMENT_STATUS.OVERDUE,
  ]

  const { data: installments, error: iErr } = await supabase
    .from('contract_installments')
    .select('amount, amount_paid')
    .in('contract_id', contractIds)
    .in('status_id', openStatuses)
    .is('deleted_at', null)

  if (iErr) throw iErr

  const balance = (installments ?? []).reduce(
    (sum, i) => sum + (Number(i.amount) - Number(i.amount_paid)),
    0
  )

  const { error: uErr } = await supabase
    .from('customers')
    .update({ outstanding_balance: balance, updated_at: new Date().toISOString() })
    .eq('id', customerId)
    .eq('company_id', companyId)

  if (uErr) throw uErr

  return balance
}
