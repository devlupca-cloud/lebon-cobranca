import { createClient } from '@/lib/supabase/client'
import { getOverdueInstallments } from '@/lib/supabase/installments'

const DAYS_RECENT = 7
const MAX_OVERDUE = 5
const MAX_PAYMENTS = 10

function formatMoney(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function customerDisplayName(customer: { full_name: string | null; legal_name: string | null } | null): string {
  if (!customer) return 'Cliente'
  const name = customer.full_name?.trim() || customer.legal_name?.trim()
  return name || 'Cliente'
}

export type ActivityItem = {
  id: string
  type: 'overdue' | 'payment'
  title: string
  subtitle: string
  date: string
  href: string
}

/**
 * Atividade recente para o sino de notificações: parcelas atrasadas (em aberto) +
 * pagamentos registrados nos últimos dias. Só painel web, sem push/e-mail.
 */
export async function getRecentActivity(companyId: string): Promise<ActivityItem[]> {
  const supabase = createClient()
  const today = new Date()
  const since = new Date(today)
  since.setDate(since.getDate() - DAYS_RECENT)
  const sinceIso = since.toISOString()

  const items: ActivityItem[] = []

  // 1) Parcelas atrasadas (não quitadas) — limitar às mais recentes por vencimento
  const overdue = await getOverdueInstallments(companyId)
  const overdueSlice = overdue.slice(0, MAX_OVERDUE)
  for (const row of overdueSlice) {
    const contract = row.contracts ?? row.contract
    const customer = contract?.customer ?? contract?.customers ?? null
    const name = customerDisplayName(customer)
    const contractId = row.contract_id
    items.push({
      id: `overdue-${row.id}`,
      type: 'overdue',
      title: 'Parcela vencida',
      subtitle: `${name} – ${formatMoney(row.amount - row.amount_paid)}`,
      date: row.due_date,
      href: `/detalhes-contrato/${contractId}`,
    })
  }

  // 2) Pagamentos registrados nos últimos DAYS_RECENT dias
  const { data: payments, error } = await supabase
    .from('installment_payments')
    .select(
      `
      id,
      paid_amount,
      paid_at,
      created_at,
      contract_installments (
        installment_number,
        contract_id,
        contracts (
          contract_number,
          customer:customers!customer_id ( full_name, legal_name )
        )
      )
    `
    )
    .eq('company_id', companyId)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(MAX_PAYMENTS)

  if (error) throw error

  type PaymentRow = {
    id: string
    paid_amount: number
    paid_at: string
    created_at: string
    contract_installments: {
      installment_number: number
      contract_id: string
      contracts: {
        contract_number: string | null
        customers: { full_name: string | null; legal_name: string | null } | null
      } | null
    } | null
  }
  const paymentRows = (payments ?? []) as unknown as Array<PaymentRow>

  for (const p of paymentRows) {
    const rawInst = p.contract_installments
    const inst = Array.isArray(rawInst) ? rawInst[0] : rawInst
    const rawContract = inst?.contracts
    const contract = Array.isArray(rawContract) ? rawContract[0] : rawContract ?? null
    const rawCustomer = contract?.customer ?? contract?.customers
    const customer = Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer ?? null
    const name = customerDisplayName(customer)
    const contractId = inst?.contract_id ?? ''
    items.push({
      id: `payment-${p.id}`,
      type: 'payment',
      title: 'Pagamento recebido',
      subtitle: `${name} – ${formatMoney(p.paid_amount)}`,
      date: p.paid_at ?? p.created_at,
      href: `/detalhes-contrato/${contractId}`,
    })
  }

  // Ordenar por data (mais recente primeiro); date pode ser YYYY-MM-DD
  items.sort((a, b) => {
    const dA = a.date.replace(/\D/g, '')
    const dB = b.date.replace(/\D/g, '')
    if (dA !== dB) return dB.localeCompare(dA)
    return 0
  })

  return items.slice(0, MAX_OVERDUE + MAX_PAYMENTS)
}
