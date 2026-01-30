import { createClient } from '@/lib/supabase/client'
import type { Customer } from '@/types/database'

export type GetCustomersParams = {
  companyId: string
  limit?: number
  offset?: number
  name?: string
  cpf?: string
  cnpj?: string
  statusId?: number | null
}

export async function getCustomers(
  params: GetCustomersParams
): Promise<Customer[]> {
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
  const list = Array.isArray(data) ? data : data != null && Array.isArray((data as { data?: unknown }).data) ? (data as { data: Customer[] }).data : []
  return list as Customer[]
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

export type GetCustomersAutocompleteParams = {
  companyId: string
  search?: string
}

export async function getCustomersAutocomplete(
  params: GetCustomersAutocompleteParams
): Promise<{ id: string; label: string }[]> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_customers_autocomplete', {
    p_company_id: params.companyId,
    p_search: params.search ?? '',
  })

  if (error) throw error
  const list = (data ?? []) as { id?: string; label?: string; full_name?: string }[]
  return list.map((row) => ({
    id: row.id ?? row.label ?? '',
    label: row.label ?? row.full_name ?? String(row.id ?? ''),
  }))
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
  email?: string | null
  phone?: string | null
  mobile?: string | null
  [key: string]: unknown
}

export async function insertCustomer(
  customer: InsertCustomerInput
): Promise<Customer> {
  const supabase = createClient()
  const row: Record<string, unknown> = {
    company_id: customer.company_id,
    person_type: customer.person_type,
    status_id: customer.status_id,
    cpf: customer.cpf ?? null,
    cnpj: customer.cnpj ?? null,
    legal_name: customer.legal_name ?? null,
    trade_name: customer.trade_name ?? null,
    full_name: customer.full_name ?? null,
    phone: customer.phone ?? null,
    mobile: customer.mobile ?? null,
    email: customer.email ?? null,
  }
  const { data, error } = await supabase
    .from('customers')
    .insert(row)
    .select()
    .single()

  if (error) throw error
  return data as Customer
}
