import { createClient } from '@/lib/supabase/client'
import { CONTRACT_STATUS, INSTALLMENT_STATUS } from '@/types/enums'

// ──────────────────────────── Types ───────────────────────────────

export type CashFlowMonth = {
  month: string // YYYY-MM
  expected: number
  received: number
}

export type FinancialSummary = {
  totalReceivable: number
  totalReceived: number
  totalOverdue: number
  activeContracts: number
  closedContracts: number
}

export type OverdueBucket = {
  range: string
  count: number
  total: number
}

// ──────────────────────────── Cash flow forecast ──────────────────

export async function getCashFlowForecast(
  companyId: string,
  startDate: string,
  endDate: string
): Promise<CashFlowMonth[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('contract_installments')
    .select('due_date, amount, amount_paid, status_id')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .gte('due_date', startDate)
    .lte('due_date', endDate)

  if (error) throw error

  const months = new Map<string, { expected: number; received: number }>()

  for (const row of data ?? []) {
    const month = (row.due_date as string).substring(0, 7)
    const entry = months.get(month) ?? { expected: 0, received: 0 }
    entry.expected += Number(row.amount)
    entry.received += Number(row.amount_paid)
    months.set(month, entry)
  }

  return Array.from(months.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, values]) => ({ month, ...values }))
}

// ──────────────────────────── Financial summary ──────────────────

export async function getFinancialSummary(
  companyId: string
): Promise<FinancialSummary> {
  const supabase = createClient()

  // Installments totals
  const { data: installments, error: iErr } = await supabase
    .from('contract_installments')
    .select('amount, amount_paid, status_id')
    .eq('company_id', companyId)
    .is('deleted_at', null)

  if (iErr) throw iErr

  let totalReceivable = 0
  let totalReceived = 0
  let totalOverdue = 0

  for (const row of installments ?? []) {
    const amount = Number(row.amount)
    const paid = Number(row.amount_paid)
    totalReceivable += amount
    totalReceived += paid

    if (row.status_id === INSTALLMENT_STATUS.OVERDUE) {
      totalOverdue += amount - paid
    }
  }

  // Contract counts
  const { count: activeCount, error: acErr } = await supabase
    .from('contracts')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status_id', CONTRACT_STATUS.ACTIVE)
    .is('deleted_at', null)

  if (acErr) throw acErr

  const { count: closedCount, error: ccErr } = await supabase
    .from('contracts')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status_id', CONTRACT_STATUS.CLOSED)
    .is('deleted_at', null)

  if (ccErr) throw ccErr

  return {
    totalReceivable,
    totalReceived,
    totalOverdue,
    activeContracts: activeCount ?? 0,
    closedContracts: closedCount ?? 0,
  }
}

// ──────────────────────────── Overdue summary by bucket ──────────

export async function getOverdueSummary(
  companyId: string
): Promise<OverdueBucket[]> {
  const supabase = createClient()
  const today = new Date()

  const { data, error } = await supabase
    .from('contract_installments')
    .select('due_date, amount, amount_paid')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .lt('due_date', today.toISOString().split('T')[0])
    .in('status_id', [
      INSTALLMENT_STATUS.OPEN,
      INSTALLMENT_STATUS.PARTIAL,
      INSTALLMENT_STATUS.OVERDUE,
    ])

  if (error) throw error

  const buckets: Record<string, { count: number; total: number }> = {
    '1-30': { count: 0, total: 0 },
    '31-60': { count: 0, total: 0 },
    '61-90': { count: 0, total: 0 },
    '90+': { count: 0, total: 0 },
  }

  for (const row of data ?? []) {
    const dueDate = new Date(row.due_date as string)
    const daysOverdue = Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    const outstanding = Number(row.amount) - Number(row.amount_paid)

    let bucket: string
    if (daysOverdue <= 30) bucket = '1-30'
    else if (daysOverdue <= 60) bucket = '31-60'
    else if (daysOverdue <= 90) bucket = '61-90'
    else bucket = '90+'

    buckets[bucket].count++
    buckets[bucket].total += outstanding
  }

  return Object.entries(buckets).map(([range, values]) => ({
    range,
    ...values,
  }))
}
