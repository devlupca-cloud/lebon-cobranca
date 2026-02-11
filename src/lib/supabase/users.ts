import { createClient } from '@/lib/supabase/client'
import type { CompanyUser } from '@/types/database'

// ──────────────────────────── List ────────────────────────────────

export async function getCompanyUsers(
  companyId: string
): Promise<CompanyUser[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('company_users')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw error
  return (data ?? []) as CompanyUser[]
}

// ──────────────────────────── Create ──────────────────────────────

export type CreateCompanyUserInput = {
  company_id: string
  name: string
  email: string
  role?: string | null
  user_id?: string | null
}

export async function createCompanyUser(
  input: CreateCompanyUserInput
): Promise<CompanyUser> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('company_users')
    .insert({
      company_id: input.company_id,
      name: input.name,
      email: input.email,
      role: input.role ?? null,
      user_id: input.user_id ?? null,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error
  return data as CompanyUser
}

// ──────────────────────────── Update ──────────────────────────────

export type UpdateCompanyUserInput = {
  name?: string
  email?: string
  role?: string | null
}

export async function updateCompanyUser(
  userId: string,
  companyId: string,
  input: UpdateCompanyUserInput
): Promise<CompanyUser> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('company_users')
    .update(input)
    .eq('id', userId)
    .eq('company_id', companyId)
    .select()
    .single()

  if (error) throw error
  return data as CompanyUser
}

// ──────────────────────────── Deactivate ──────────────────────────

export async function deactivateCompanyUser(
  userId: string,
  companyId: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('company_users')
    .update({ is_active: false })
    .eq('id', userId)
    .eq('company_id', companyId)

  if (error) throw error
}
