import { createClient } from '@/lib/supabase/client'
import type { CompanyExpense } from '@/types/database'

export type ListExpensesParams = {
  companyId: string
  expenseType?: string | null
  startDate?: string | null
  endDate?: string | null
}

export async function getExpenseById(id: string, companyId: string): Promise<CompanyExpense | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('company_expenses')
    .select('*')
    .eq('id', id)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  return data as CompanyExpense | null
}

export async function getExpenses(params: ListExpensesParams): Promise<CompanyExpense[]> {
  const supabase = createClient()
  let query = supabase
    .from('company_expenses')
    .select('*')
    .eq('company_id', params.companyId)
    .is('deleted_at', null)
    .order('due_date', { ascending: true })

  if (params.expenseType != null && params.expenseType.trim() !== '') {
    query = query.eq('expense_type', params.expenseType.trim())
  }
  if (params.startDate) {
    query = query.gte('due_date', params.startDate)
  }
  if (params.endDate) {
    query = query.lte('due_date', params.endDate)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as CompanyExpense[]
}

export type CreateExpenseInput = {
  company_id: string
  payee_name: string
  amount: number
  due_date: string
  expense_type?: string
  notes?: string | null
  title?: string | null
  contact_name?: string | null
  payment_date?: string | null
}

export async function createExpense(input: CreateExpenseInput): Promise<CompanyExpense> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('company_expenses')
    .insert({
      company_id: input.company_id,
      payee_name: input.payee_name.trim(),
      amount: input.amount,
      due_date: input.due_date,
      expense_type: input.expense_type?.trim() ?? 'Outros',
      notes: input.notes?.trim() || null,
      title: input.title?.trim() || null,
      contact_name: input.contact_name?.trim() || null,
      payment_date: input.payment_date?.slice(0, 10) || null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data as CompanyExpense
}

export type UpdateExpenseInput = {
  payee_name?: string
  amount?: number
  due_date?: string
  expense_type?: string
  notes?: string | null
  title?: string | null
  contact_name?: string | null
  payment_date?: string | null
}

export async function updateExpense(
  id: string,
  companyId: string,
  input: UpdateExpenseInput
): Promise<CompanyExpense> {
  const supabase = createClient()
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.payee_name !== undefined) payload.payee_name = input.payee_name.trim()
  if (input.amount !== undefined) payload.amount = input.amount
  if (input.due_date !== undefined) payload.due_date = input.due_date
  if (input.expense_type !== undefined) payload.expense_type = input.expense_type?.trim() ?? 'Outros'
  if (input.notes !== undefined) payload.notes = input.notes?.trim() || null
  if (input.title !== undefined) payload.title = input.title?.trim() || null
  if (input.contact_name !== undefined) payload.contact_name = input.contact_name?.trim() || null
  if (input.payment_date !== undefined) payload.payment_date = input.payment_date?.slice(0, 10) || null

  const { data, error } = await supabase
    .from('company_expenses')
    .update(payload)
    .eq('id', id)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) throw error
  return data as CompanyExpense
}

export async function deleteExpense(id: string, companyId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('company_expenses')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('company_id', companyId)

  if (error) throw error
}
