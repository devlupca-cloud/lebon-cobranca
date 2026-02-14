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
    .is('customer.deleted_at', null)
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

export type ExtratoFinanceiroData = {
  /** Saldo total recebido (amount_paid de todas as parcelas) */
  totalAvailable: number
  /** Valor a receber neste mês (parcelas abertas com due_date neste mês) */
  toReceiveThisMonth: number
  /** Receitas previstas neste mês (soma das parcelas com due_date neste mês) */
  expectedRevenue: number
  /** Variação % das receitas previstas em relação ao mês anterior */
  expectedRevenueChange: number | null
  /** Parcelas pendentes (open + partial + overdue) */
  pendingInstallments: { count: number; total: number }
  /** Contratos ativos */
  activeContracts: { count: number; total: number }
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
      .is('customer.deleted_at', null),
    supabase
      .from('contracts')
      .select('id, customer:customers!inner(id)', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status_id', CONTRACT_STATUS.ACTIVE)
      .is('deleted_at', null)
      .is('customer.deleted_at', null)
      .lt('created_at', thisMonthStart),
    supabase
      .from('contracts')
      .select('id, customer:customers!inner(id)', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .is('customer.deleted_at', null)
      .gte('created_at', thisMonthStart),
    supabase
      .from('contracts')
      .select('id, customer:customers!inner(id)', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .is('customer.deleted_at', null)
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
    .is('customer.deleted_at', null)
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
      .is('customer.deleted_at', null)
    const { count: closedCount } = await supabase
      .from('contracts')
      .select('id, customer:customers!inner(id)', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status_id', CONTRACT_STATUS.CLOSED)
      .is('deleted_at', null)
      .is('customer.deleted_at', null)
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
    .is('customer.deleted_at', null)

  if (acErr) throw acErr

  const { count: closedCount, error: ccErr } = await supabase
    .from('contracts')
    .select('id, customer:customers!inner(id)', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status_id', CONTRACT_STATUS.CLOSED)
    .is('deleted_at', null)
    .is('customer.deleted_at', null)

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

// ──────────────────────────── Extrato financeiro ─────────────────

export async function getExtratoFinanceiroData(
  companyId: string
): Promise<ExtratoFinanceiroData> {
  const supabase = createClient()
  const contractIds = await getContractIdsWithActiveCustomer(companyId)

  if (contractIds.length === 0) {
    return {
      totalAvailable: 0,
      toReceiveThisMonth: 0,
      expectedRevenue: 0,
      expectedRevenueChange: null,
      pendingInstallments: { count: 0, total: 0 },
      activeContracts: { count: 0, total: 0 },
    }
  }

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().slice(0, 10)
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toISOString().slice(0, 10)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString().slice(0, 10)

  const [
    { data: allInstallments },
    { data: thisMonthInstallments },
    { data: lastMonthInstallments },
    { count: activeContractsCount },
    { data: activeContractsData },
  ] = await Promise.all([
    // Todas as parcelas (para totalAvailable e parcelas pendentes)
    supabase
      .from('contract_installments')
      .select('amount, amount_paid, status_id')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .in('contract_id', contractIds),
    // Parcelas deste mês (receitas previstas)
    supabase
      .from('contract_installments')
      .select('amount, amount_paid, status_id')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .in('contract_id', contractIds)
      .gte('due_date', thisMonthStart)
      .lt('due_date', nextMonthStart),
    // Parcelas do mês passado (para calcular variação %)
    supabase
      .from('contract_installments')
      .select('amount')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .in('contract_id', contractIds)
      .gte('due_date', lastMonthStart)
      .lt('due_date', thisMonthStart),
    // Contagem de contratos ativos
    supabase
      .from('contracts')
      .select('id, customer:customers!inner(id)', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status_id', CONTRACT_STATUS.ACTIVE)
      .is('deleted_at', null)
      .is('customer.deleted_at', null),
    // Total dos contratos ativos
    supabase
      .from('contracts')
      .select('total_amount, customer:customers!inner(id)')
      .eq('company_id', companyId)
      .eq('status_id', CONTRACT_STATUS.ACTIVE)
      .is('deleted_at', null)
      .is('customer.deleted_at', null),
  ])

  // Saldo total recebido
  let totalAvailable = 0
  let pendingCount = 0
  let pendingTotal = 0
  const pendingStatuses: number[] = [INSTALLMENT_STATUS.OPEN, INSTALLMENT_STATUS.PARTIAL, INSTALLMENT_STATUS.OVERDUE]

  for (const row of allInstallments ?? []) {
    totalAvailable += Number(row.amount_paid)
    if (pendingStatuses.includes(Number(row.status_id))) {
      pendingCount++
      pendingTotal += Number(row.amount) - Number(row.amount_paid)
    }
  }

  // Receitas previstas este mês (parcelas não pagas deste mês)
  let expectedRevenue = 0
  let toReceiveThisMonth = 0
  for (const row of thisMonthInstallments ?? []) {
    expectedRevenue += Number(row.amount)
    if (row.status_id !== INSTALLMENT_STATUS.PAID) {
      toReceiveThisMonth += Number(row.amount) - Number(row.amount_paid)
    }
  }

  // Receitas previstas mês passado (para variação %)
  const lastMonthRevenue = (lastMonthInstallments ?? []).reduce(
    (sum, row) => sum + Number(row.amount), 0
  )
  const expectedRevenueChange = lastMonthRevenue > 0
    ? ((expectedRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : null

  // Contratos ativos
  const activeTotal = (activeContractsData ?? []).reduce(
    (sum, row) => sum + Number((row as Record<string, unknown>).total_amount ?? 0), 0
  )

  return {
    totalAvailable,
    toReceiveThisMonth,
    expectedRevenue,
    expectedRevenueChange,
    pendingInstallments: { count: pendingCount, total: pendingTotal },
    activeContracts: { count: activeContractsCount ?? 0, total: activeTotal },
  }
}

// ──────────────────────────── Movimentações recentes ─────────────

export type MovementType = 'payment' | 'expense' | 'installment' | 'new_contract'

export type RecentMovement = {
  id: string
  type: MovementType
  title: string
  subtitle: string
  /** Valor absoluto */
  amount: number
  /** Data ISO para ordenação */
  date: string
}

/**
 * Busca movimentações recentes de múltiplas fontes:
 * pagamentos, despesas, parcelas próximas e novos contratos.
 */
export async function getRecentMovements(
  companyId: string,
  limit = 10
): Promise<RecentMovement[]> {
  const supabase = createClient()
  const now = new Date()
  const since = new Date(now)
  since.setDate(since.getDate() - 30)
  const sinceIso = since.toISOString()

  // Próximos 7 dias para parcelas pendentes
  const in7days = new Date(now)
  in7days.setDate(in7days.getDate() + 7)
  const todayStr = now.toISOString().split('T')[0]
  const in7daysStr = in7days.toISOString().split('T')[0]

  const [
    { data: payments },
    { data: expenses },
    { data: installments },
    { data: newContracts },
  ] = await Promise.all([
    // Pagamentos recebidos
    supabase
      .from('installment_payments')
      .select(`
        id, paid_amount, paid_at, created_at,
        contract_installments (
          installment_number,
          contract_id,
          contracts (
            contract_number,
            customer:customers!customer_id ( full_name, legal_name )
          )
        )
      `)
      .eq('company_id', companyId)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(limit),
    // Despesas
    supabase
      .from('company_expenses')
      .select('id, payee_name, amount, due_date, expense_type, title, created_at')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(limit),
    // Parcelas próximas do vencimento (pendentes)
    supabase
      .from('contract_installments')
      .select(`
        id, installment_number, due_date, amount, amount_paid, contract_id,
        contracts (
          contract_number,
          customer:customers!customer_id ( full_name, legal_name )
        )
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .in('status_id', [INSTALLMENT_STATUS.OPEN, INSTALLMENT_STATUS.PARTIAL])
      .gte('due_date', todayStr)
      .lte('due_date', in7daysStr)
      .order('due_date', { ascending: true })
      .limit(limit),
    // Novos contratos
    supabase
      .from('contracts')
      .select(`
        id, contract_number, total_amount, created_at,
        customer:customers!inner ( full_name, legal_name )
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('status_id', CONTRACT_STATUS.ACTIVE)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(limit),
  ])

  const items: RecentMovement[] = []

  // Pagamentos
  for (const p of (payments ?? []) as Array<Record<string, unknown>>) {
    const rawInst = p.contract_installments as Record<string, unknown> | Array<Record<string, unknown>> | null
    const inst = Array.isArray(rawInst) ? rawInst[0] : rawInst
    const rawContract = inst?.contracts as Record<string, unknown> | Array<Record<string, unknown>> | null
    const contract = Array.isArray(rawContract) ? rawContract[0] : rawContract
    const rawCustomer = contract?.customer ?? contract?.customers as { full_name: string | null; legal_name: string | null } | Array<{ full_name: string | null; legal_name: string | null }> | null
    const customer = Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer
    const name = customer?.full_name || customer?.legal_name || 'Cliente'
    const contractNumber = (contract?.contract_number as string) || ''
    items.push({
      id: `payment-${p.id}`,
      type: 'payment',
      title: `Pagamento${contractNumber ? ` - Contrato #${contractNumber}` : ''}`,
      subtitle: `Cliente: ${name}`,
      amount: Number(p.paid_amount),
      date: (p.paid_at as string) ?? (p.created_at as string),
    })
  }

  // Despesas
  for (const e of (expenses ?? []) as Array<Record<string, unknown>>) {
    items.push({
      id: `expense-${e.id}`,
      type: 'expense',
      title: `Despesa - ${e.payee_name || 'Fornecedor'}`,
      subtitle: (e.title || e.expense_type || '') as string,
      amount: Number(e.amount),
      date: (e.due_date as string) ?? (e.created_at as string),
    })
  }

  // Parcelas próximas
  for (const i of (installments ?? []) as Array<Record<string, unknown>>) {
    const rawContract = i.contracts as Record<string, unknown> | Array<Record<string, unknown>> | null
    const contract = Array.isArray(rawContract) ? rawContract[0] : rawContract
    const rawCustomer = contract?.customer ?? contract?.customers as { full_name: string | null; legal_name: string | null } | Array<{ full_name: string | null; legal_name: string | null }> | null
    const customer = Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer
    const name = customer?.full_name || customer?.legal_name || 'Cliente'
    const contractNumber = (contract?.contract_number as string) || ''
    const totalInstallments = '' // não temos o total aqui facilmente
    items.push({
      id: `installment-${i.id}`,
      type: 'installment',
      title: `Parcela ${i.installment_number}${contractNumber ? ` - Contrato #${contractNumber}` : ''}`,
      subtitle: `Vencimento: ${formatDateShort(i.due_date as string)}\nCliente: ${name}`,
      amount: Number(i.amount) - Number(i.amount_paid),
      date: i.due_date as string,
    })
  }

  // Novos contratos
  for (const c of (newContracts ?? []) as Array<Record<string, unknown>>) {
    const rawCustomer = c.customer as { full_name: string | null; legal_name: string | null } | Array<{ full_name: string | null; legal_name: string | null }> | null
    const customer = Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer
    const name = customer?.full_name || customer?.legal_name || 'Cliente'
    const contractNumber = (c.contract_number as string) || ''
    items.push({
      id: `contract-${c.id}`,
      type: 'new_contract',
      title: `Entrada - Novo Contrato`,
      subtitle: `Contrato${contractNumber ? ` #${contractNumber}` : ''} - ${name}`,
      amount: Number(c.total_amount ?? 0),
      date: c.created_at as string,
    })
  }

  // Ordenar por data decrescente
  items.sort((a, b) => b.date.localeCompare(a.date))

  return items.slice(0, limit)
}

// ──────────────────────────── Movimentações paginadas ─────────────

export type PaginatedMovements = {
  total: number
  data: RecentMovement[]
}

export type MovementFilters = {
  limit: number
  offset: number
  type?: MovementType
  startDate?: string
  endDate?: string
  search?: string
}

/**
 * Busca movimentações de múltiplas fontes com paginação e filtros.
 * Diferente de getRecentMovements:
 *  - NÃO aplica filtro de 30 dias em pagamentos/despesas/contratos
 *  - Mostra TODAS as parcelas abertas/parciais (sem janela de 7 dias)
 *  - Exclui movimentações de clientes com exclusão lógica (deleted_at)
 *  - Aceita filtros: type, startDate, endDate, search
 */
export async function getRecentMovementsPaginated(
  companyId: string,
  filters: MovementFilters
): Promise<PaginatedMovements> {
  const supabase = createClient()
  const { limit, offset, type, startDate, endDate, search } = filters

  // Filtra contratos cujo cliente não está excluído
  let contractIds = await getContractIdsWithActiveCustomer(companyId)

  // Busca por cliente/fornecedor
  let searchContractIds: string[] | null = null
  if (search && search.trim() !== '') {
    const searchTerm = `%${search.trim()}%`
    const { data: matchingCustomers } = await supabase
      .from('customers')
      .select('id')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .or(`full_name.ilike.${searchTerm},legal_name.ilike.${searchTerm}`)
    const customerIds = (matchingCustomers ?? []).map((c) => c.id)
    if (customerIds.length > 0) {
      const { data: matchingContracts } = await supabase
        .from('contracts')
        .select('id')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .in('customer_id', customerIds)
      searchContractIds = (matchingContracts ?? []).map((c) => c.id)
    } else {
      searchContractIds = []
    }
    contractIds = contractIds.filter((id) => searchContractIds!.includes(id))
  }
  if (contractIds.length === 0 && (!search || searchContractIds === null || searchContractIds.length > 0)) {
    // Ainda pode haver despesas (não dependem de cliente)
    let expensesQuery = supabase
      .from('company_expenses')
      .select('id, payee_name, amount, due_date, expense_type, title, created_at', { count: 'exact' })
      .eq('company_id', companyId)
      .is('deleted_at', null)

    if (type && type !== 'expense') {
      return { total: 0, data: [] }
    }
    if (startDate) expensesQuery = expensesQuery.gte('created_at', startDate)
    if (endDate) expensesQuery = expensesQuery.lte('created_at', endDate)
    if (search && search.trim() !== '') {
      const searchTerm = `%${search.trim()}%`
      expensesQuery = expensesQuery.or(`payee_name.ilike.${searchTerm},title.ilike.${searchTerm}`)
    }
    expensesQuery = expensesQuery.order('created_at', { ascending: false }).limit(offset + limit)

    const { data: expenses, count: expensesCount } = await expensesQuery

    const items: RecentMovement[] = (expenses ?? []).map((e) => ({
      id: `expense-${e.id}`,
      type: 'expense' as const,
      title: `Despesa - ${e.payee_name || 'Fornecedor'}`,
      subtitle: ((e.title || e.expense_type || '') as string),
      amount: Number(e.amount),
      date: (e.due_date as string) ?? (e.created_at as string),
    }))

    return { total: expensesCount ?? 0, data: items.slice(offset, offset + limit) }
  }

  const fetchSize = offset + limit

  // Aplicar filtros nas queries
  const shouldFetchPayments = !type || type === 'payment'
  const shouldFetchExpenses = !type || type === 'expense'
  const shouldFetchInstallments = !type || type === 'installment'
  const shouldFetchContracts = !type || type === 'new_contract'

  // Se search ativo e nenhum contrato bateu, pular queries que dependem de contrato
  const skipContractQueries = search && searchContractIds !== null && searchContractIds.length === 0 && contractIds.length === 0

  const [
    { data: payments, count: paymentsCount },
    { data: expenses, count: expensesCount },
    { data: installments, count: installmentsCount },
    { data: newContracts, count: newContractsCount },
  ] = await Promise.all([
    // Pagamentos
    shouldFetchPayments && !skipContractQueries && contractIds.length > 0
      ? (async () => {
          let q = supabase
            .from('installment_payments')
            .select(`
              id, paid_amount, paid_at, created_at,
              contract_installments (
                installment_number,
                contract_id,
contracts (
                contract_number,
                customer:customers!customer_id ( full_name, legal_name )
              )
              )
            `, { count: 'exact' })
            .eq('company_id', companyId)
          if (startDate) q = q.gte('created_at', startDate)
          if (endDate) q = q.lte('created_at', endDate)
          return await q.order('created_at', { ascending: false }).limit(fetchSize)
        })()
      : { data: [], count: 0 },
    // Despesas
    shouldFetchExpenses
      ? (async () => {
          let q = supabase
            .from('company_expenses')
            .select('id, payee_name, amount, due_date, expense_type, title, created_at', { count: 'exact' })
            .eq('company_id', companyId)
            .is('deleted_at', null)
          if (startDate) q = q.gte('created_at', startDate)
          if (endDate) q = q.lte('created_at', endDate)
          if (search && search.trim() !== '') {
            const searchTerm = `%${search.trim()}%`
            q = q.or(`payee_name.ilike.${searchTerm},title.ilike.${searchTerm}`)
          }
          return await q.order('created_at', { ascending: false }).limit(fetchSize)
        })()
      : { data: [], count: 0 },
    // Parcelas abertas/parciais
    shouldFetchInstallments && !skipContractQueries && contractIds.length > 0
      ? (async () => {
          let q = supabase
            .from('contract_installments')
            .select(`
              id, installment_number, due_date, amount, amount_paid, contract_id,
              contracts (
                contract_number,
                customer:customers!customer_id ( full_name, legal_name )
              )
            `, { count: 'exact' })
            .eq('company_id', companyId)
            .is('deleted_at', null)
            .in('contract_id', contractIds)
            .in('status_id', [INSTALLMENT_STATUS.OPEN, INSTALLMENT_STATUS.PARTIAL])
          if (startDate) q = q.gte('due_date', startDate)
          if (endDate) q = q.lte('due_date', endDate)
          return await q.order('due_date', { ascending: false }).limit(fetchSize)
        })()
      : { data: [], count: 0 },
    // Novos contratos
    shouldFetchContracts && !skipContractQueries && contractIds.length > 0
      ? (async () => {
          let q = supabase
            .from('contracts')
            .select(`
              id, contract_number, total_amount, created_at,
              customer:customers!inner ( full_name, legal_name )
            `, { count: 'exact' })
            .eq('company_id', companyId)
            .is('deleted_at', null)
            .is('customer.deleted_at', null)
            .eq('status_id', CONTRACT_STATUS.ACTIVE)
          if (startDate) q = q.gte('created_at', startDate)
          if (endDate) q = q.lte('created_at', endDate)
          if (search && search.trim() !== '') {
            const searchTerm = `%${search.trim()}%`
            q = q.or(`full_name.ilike.${searchTerm},legal_name.ilike.${searchTerm}`, { referencedTable: 'customer' })
          }
          return await q.order('created_at', { ascending: false }).limit(fetchSize)
        })()
      : { data: [], count: 0 },
  ])

  const total = (paymentsCount ?? 0) + (expensesCount ?? 0) + (installmentsCount ?? 0) + (newContractsCount ?? 0)

  // Montar items usando a mesma lógica de getRecentMovements
  const items: RecentMovement[] = []

  for (const p of (payments ?? []) as Array<Record<string, unknown>>) {
    const rawInst = p.contract_installments as Record<string, unknown> | Array<Record<string, unknown>> | null
    const inst = Array.isArray(rawInst) ? rawInst[0] : rawInst
    const rawContract = inst?.contracts as Record<string, unknown> | Array<Record<string, unknown>> | null
    const contract = Array.isArray(rawContract) ? rawContract[0] : rawContract
    const rawCustomer = contract?.customer ?? contract?.customers as { full_name: string | null; legal_name: string | null } | Array<{ full_name: string | null; legal_name: string | null }> | null
    const customer = Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer
    const name = customer?.full_name || customer?.legal_name || 'Cliente'
    const contractNumber = (contract?.contract_number as string) || ''
    items.push({
      id: `payment-${p.id}`,
      type: 'payment',
      title: `Pagamento${contractNumber ? ` - Contrato #${contractNumber}` : ''}`,
      subtitle: `Cliente: ${name}`,
      amount: Number(p.paid_amount),
      date: (p.paid_at as string) ?? (p.created_at as string),
    })
  }

  for (const e of (expenses ?? []) as Array<Record<string, unknown>>) {
    items.push({
      id: `expense-${e.id}`,
      type: 'expense',
      title: `Despesa - ${e.payee_name || 'Fornecedor'}`,
      subtitle: (e.title || e.expense_type || '') as string,
      amount: Number(e.amount),
      date: (e.due_date as string) ?? (e.created_at as string),
    })
  }

  for (const i of (installments ?? []) as Array<Record<string, unknown>>) {
    const rawContract = i.contracts as Record<string, unknown> | Array<Record<string, unknown>> | null
    const contract = Array.isArray(rawContract) ? rawContract[0] : rawContract
    const rawCustomer = contract?.customer ?? contract?.customers as { full_name: string | null; legal_name: string | null } | Array<{ full_name: string | null; legal_name: string | null }> | null
    const customer = Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer
    const name = customer?.full_name || customer?.legal_name || 'Cliente'
    const contractNumber = (contract?.contract_number as string) || ''
    items.push({
      id: `installment-${i.id}`,
      type: 'installment',
      title: `Parcela ${i.installment_number}${contractNumber ? ` - Contrato #${contractNumber}` : ''}`,
      subtitle: `Vencimento: ${formatDateShort(i.due_date as string)}\nCliente: ${name}`,
      amount: Number(i.amount) - Number(i.amount_paid),
      date: i.due_date as string,
    })
  }

  for (const c of (newContracts ?? []) as Array<Record<string, unknown>>) {
    const rawCustomer = c.customer as { full_name: string | null; legal_name: string | null } | Array<{ full_name: string | null; legal_name: string | null }> | null
    const customer = Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer
    const name = customer?.full_name || customer?.legal_name || 'Cliente'
    const contractNumber = (c.contract_number as string) || ''
    items.push({
      id: `contract-${c.id}`,
      type: 'new_contract',
      title: `Entrada - Novo Contrato`,
      subtitle: `Contrato${contractNumber ? ` #${contractNumber}` : ''} - ${name}`,
      amount: Number(c.total_amount ?? 0),
      date: c.created_at as string,
    })
  }

  items.sort((a, b) => b.date.localeCompare(a.date))

  return {
    total,
    data: items.slice(offset, offset + limit),
  }
}

function formatDateShort(iso: string): string {
  if (!iso) return '—'
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}
