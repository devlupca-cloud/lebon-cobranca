import { createClient } from '@/lib/supabase/client'
import { CONTRACT_STATUS, INSTALLMENT_STATUS } from '@/types/enums'

/**
 * Retorna IDs de contratos cujo cliente NÃO está excluído (deleted_at).
 * Usado para que relatórios e somas não incluam dados de clientes com exclusão lógica.
 */
async function getContractIdsWithActiveCustomer(
  companyId: string
): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('contracts')
    .select('id, customer:customers!inner(id)')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .is('customers.deleted_at', null)
  if (error) return []
  return (data ?? []).map((r) => r.id as string)
}

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

export type DashboardStats = {
  totalCustomers: number
  activeContracts: number
  totalValue: number
  newThisMonth: number
  /** Comparação com mês anterior para exibir % (pode ser null se não houver dado) */
  customersChangePercent: number | null
  activeContractsChangePercent: number | null
  totalValueChangePercent: number | null
  newThisMonthChangePercent: number | null
}

// ──────────────────────────── Dashboard stats ─────────────────────

/**
 * Busca estatísticas do dashboard via RPC (uma única chamada ao banco).
 * Fallback para a lógica antiga se a RPC não existir ou falhar.
 */
export async function getDashboardStats(
  companyId: string
): Promise<DashboardStats> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_dashboard_stats', {
    p_company_id: companyId,
  })
  if (!error && data != null && typeof data === 'object') {
    const r = data as {
      totalCustomers?: number
      activeContracts?: number
      totalValue?: number
      newThisMonth?: number
      customersChangePercent?: number | null
      activeContractsChangePercent?: number | null
      totalValueChangePercent?: number | null
      newThisMonthChangePercent?: number | null
    }
    return {
      totalCustomers: Number(r.totalCustomers ?? 0),
      activeContracts: Number(r.activeContracts ?? 0),
      totalValue: Number(r.totalValue ?? 0),
      newThisMonth: Number(r.newThisMonth ?? 0),
      customersChangePercent: r.customersChangePercent ?? null,
      activeContractsChangePercent: r.activeContractsChangePercent ?? null,
      totalValueChangePercent: r.totalValueChangePercent ?? null,
      newThisMonthChangePercent: r.newThisMonthChangePercent ?? null,
    }
  }
  return getDashboardStatsLegacy(companyId)
}

/** Implementação em múltiplas queries (fallback quando a RPC não existe). */
async function getDashboardStatsLegacy(
  companyId: string
): Promise<DashboardStats> {
  const supabase = createClient()
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString()
    .slice(0, 10)

  const [
    { count: totalCustomers },
    { count: totalCustomersPrev },
    summary,
    { count: activeCount },
    { count: activeCountPrev },
    { count: newThisMonth },
    { count: newPrevMonth },
  ] = await Promise.all([
    supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .is('deleted_at', null),
    supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .lt('created_at', thisMonthStart),
    getFinancialSummary(companyId),
    supabase
      .from('contracts')
      .select('id, customer:customers!inner(id)', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status_id', CONTRACT_STATUS.ACTIVE)
      .is('deleted_at', null)
      .is('customers.deleted_at', null),
    supabase
      .from('contracts')
      .select('id, customer:customers!inner(id)', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status_id', CONTRACT_STATUS.ACTIVE)
      .is('deleted_at', null)
      .is('customers.deleted_at', null)
      .lt('created_at', thisMonthStart),
    supabase
      .from('contracts')
      .select('id, customer:customers!inner(id)', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .is('customers.deleted_at', null)
      .gte('created_at', thisMonthStart),
    supabase
      .from('contracts')
      .select('id, customer:customers!inner(id)', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .is('customers.deleted_at', null)
      .gte('created_at', lastMonthStart)
      .lt('created_at', thisMonthStart),
  ])

  const totalValue = summary.totalReceivable
  const activeContracts = activeCount ?? 0
  const customers = totalCustomers ?? 0
  const customersPrev = totalCustomersPrev ?? 0
  const activePrev = activeCountPrev ?? 0
  const newMonth = newThisMonth ?? 0
  const newPrev = newPrevMonth ?? 0

  const totalValuePrev = await getTotalReceivableForContractsCreatedBefore(companyId, thisMonthStart)

  return {
    totalCustomers: customers,
    activeContracts,
    totalValue,
    newThisMonth: newMonth,
    customersChangePercent:
      customersPrev > 0 ? ((customers - customersPrev) / customersPrev) * 100 : null,
    activeContractsChangePercent:
      activePrev > 0 ? ((activeContracts - activePrev) / activePrev) * 100 : null,
    totalValueChangePercent:
      totalValuePrev > 0 ? ((totalValue - totalValuePrev) / totalValuePrev) * 100 : null,
    newThisMonthChangePercent:
      newPrev > 0 ? ((newMonth - newPrev) / newPrev) * 100 : null,
  }
}

/** Soma do valor das parcelas (amount) dos contratos criados antes da data (aproximação do "total a receber" naquele momento). Exclui contratos de clientes com exclusão lógica. */
async function getTotalReceivableForContractsCreatedBefore(
  companyId: string,
  beforeDate: string
): Promise<number> {
  const supabase = createClient()
  const { data: contractIds, error: e1 } = await supabase
    .from('contracts')
    .select('id, customer:customers!inner(id)')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .is('customers.deleted_at', null)
    .lt('created_at', beforeDate)
  if (e1 || !contractIds?.length) return 0
  const ids = contractIds.map((r) => r.id)
  const { data: installments, error: e2 } = await supabase
    .from('contract_installments')
    .select('amount')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .in('contract_id', ids)
  if (e2) return 0
  return (installments ?? []).reduce((s, r) => s + Number(r.amount), 0)
}

// ──────────────────────────── Cash flow forecast ──────────────────

export async function getCashFlowForecast(
  companyId: string,
  startDate: string,
  endDate: string
): Promise<CashFlowMonth[]> {
  const supabase = createClient()
  const contractIds = await getContractIdsWithActiveCustomer(companyId)
  if (contractIds.length === 0) return []

  const { data, error } = await supabase
    .from('contract_installments')
    .select('due_date, amount, amount_paid, status_id')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .in('contract_id', contractIds)
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
  const contractIds = await getContractIdsWithActiveCustomer(companyId)
  if (contractIds.length === 0) {
    const { count: activeCount } = await supabase
      .from('contracts')
      .select('id, customer:customers!inner(id)', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status_id', CONTRACT_STATUS.ACTIVE)
      .is('deleted_at', null)
      .is('customers.deleted_at', null)
    const { count: closedCount } = await supabase
      .from('contracts')
      .select('id, customer:customers!inner(id)', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status_id', CONTRACT_STATUS.CLOSED)
      .is('deleted_at', null)
      .is('customers.deleted_at', null)
    return {
      totalReceivable: 0,
      totalReceived: 0,
      totalOverdue: 0,
      activeContracts: activeCount ?? 0,
      closedContracts: closedCount ?? 0,
    }
  }

  // Installments totals (apenas de contratos cujo cliente não está excluído)
  const { data: installments, error: iErr } = await supabase
    .from('contract_installments')
    .select('amount, amount_paid, status_id')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .in('contract_id', contractIds)

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

  // Contract counts (apenas contratos cujo cliente não está excluído)
  const { count: activeCount, error: acErr } = await supabase
    .from('contracts')
    .select('id, customer:customers!inner(id)', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status_id', CONTRACT_STATUS.ACTIVE)
    .is('deleted_at', null)
    .is('customers.deleted_at', null)

  if (acErr) throw acErr

  const { count: closedCount, error: ccErr } = await supabase
    .from('contracts')
    .select('id, customer:customers!inner(id)', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status_id', CONTRACT_STATUS.CLOSED)
    .is('deleted_at', null)
    .is('customers.deleted_at', null)

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
  const contractIds = await getContractIdsWithActiveCustomer(companyId)
  if (contractIds.length === 0) {
    return [
      { range: '1-30', count: 0, total: 0 },
      { range: '31-60', count: 0, total: 0 },
      { range: '61-90', count: 0, total: 0 },
      { range: '90+', count: 0, total: 0 },
    ]
  }

  const today = new Date()
  const { data, error } = await supabase
    .from('contract_installments')
    .select('due_date, amount, amount_paid')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .in('contract_id', contractIds)
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
