import { createClient } from '@/lib/supabase/client'
import type { InstallmentPayment, ContractInstallment } from '@/types/database'
import { INSTALLMENT_STATUS } from '@/types/enums'
import { checkAndCloseContract } from '@/lib/supabase/contracts'
import { updateCustomerBalance } from '@/lib/supabase/customers'

// ──────────────────────────── Types ───────────────────────────────

export type RecordPaymentInput = {
  company_id: string
  installment_id: string
  paid_amount: number
  paid_at?: string
  payment_method_id: number
  received_by_user_id?: string | null
  reference?: string | null
  notes?: string | null
}

// ──────────────────────────── Record payment ──────────────────────

export async function recordPayment(
  input: RecordPaymentInput
): Promise<InstallmentPayment> {
  const supabase = createClient()

  // 1. Insert the payment record
  const { data: payment, error: payErr } = await supabase
    .from('installment_payments')
    .insert({
      company_id: input.company_id,
      installment_id: input.installment_id,
      paid_amount: input.paid_amount,
      paid_at: input.paid_at ?? new Date().toISOString().split('T')[0],
      payment_method_id: input.payment_method_id,
      received_by_user_id: input.received_by_user_id ?? null,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (payErr) throw payErr

  // 2. Recalculate installment totals
  const installment = await recalculateInstallment(input.installment_id, input.company_id)

  // 3. Check if all installments are paid → close contract
  if (installment) {
    await checkAndCloseContract(installment.contract_id, input.company_id)

    // 4. Recalculate customer outstanding balance
    const { data: contract } = await supabase
      .from('contracts')
      .select('customer_id')
      .eq('id', installment.contract_id)
      .single()

    if (contract) {
      await updateCustomerBalance(contract.customer_id, input.company_id)
    }
  }

  return payment as InstallmentPayment
}

// ──────────────────────────── Recalculate installment ─────────────

async function recalculateInstallment(
  installmentId: string,
  companyId: string
): Promise<ContractInstallment | null> {
  const supabase = createClient()

  // Sum all payments for this installment
  const { data: payments, error: pErr } = await supabase
    .from('installment_payments')
    .select('paid_amount')
    .eq('installment_id', installmentId)
    .eq('company_id', companyId)

  if (pErr) throw pErr

  const totalPaid = (payments ?? []).reduce(
    (sum, p) => sum + Number(p.paid_amount),
    0
  )

  // Get installment amount
  const { data: inst, error: iErr } = await supabase
    .from('contract_installments')
    .select('*')
    .eq('id', installmentId)
    .single()

  if (iErr) throw iErr
  if (!inst) return null

  const installment = inst as ContractInstallment
  const amount = Number(installment.amount)

  let statusId: number
  let paidAt: string | null = null

  if (totalPaid >= amount) {
    statusId = INSTALLMENT_STATUS.PAID
    paidAt = new Date().toISOString().split('T')[0]
  } else if (totalPaid > 0) {
    statusId = INSTALLMENT_STATUS.PARTIAL
  } else {
    statusId = INSTALLMENT_STATUS.OPEN
  }

  const { error: uErr } = await supabase
    .from('contract_installments')
    .update({
      amount_paid: totalPaid,
      status_id: statusId,
      paid_at: paidAt,
    })
    .eq('id', installmentId)
    .eq('company_id', companyId)

  if (uErr) throw uErr

  return { ...installment, amount_paid: totalPaid, status_id: statusId, paid_at: paidAt }
}

// ──────────────────────────── Query payments ──────────────────────

export async function getPaymentsByInstallment(
  installmentId: string
): Promise<InstallmentPayment[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('installment_payments')
    .select('*')
    .eq('installment_id', installmentId)
    .order('paid_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as InstallmentPayment[]
}

export async function getPaymentsByContract(
  contractId: string
): Promise<InstallmentPayment[]> {
  const supabase = createClient()

  // Get all installment IDs for the contract
  const { data: installments, error: iErr } = await supabase
    .from('contract_installments')
    .select('id')
    .eq('contract_id', contractId)
    .is('deleted_at', null)

  if (iErr) throw iErr

  const ids = (installments ?? []).map((i) => i.id)
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('installment_payments')
    .select('*')
    .in('installment_id', ids)
    .order('paid_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as InstallmentPayment[]
}

// ──────────────────────────── Delete (reverse) payment ────────────

export async function deletePayment(
  paymentId: string,
  companyId: string
): Promise<void> {
  const supabase = createClient()

  // Get payment to know the installment
  const { data: payment, error: pErr } = await supabase
    .from('installment_payments')
    .select('*')
    .eq('id', paymentId)
    .eq('company_id', companyId)
    .single()

  if (pErr) throw pErr
  if (!payment) throw new Error('Pagamento não encontrado.')

  const paymentRow = payment as InstallmentPayment

  // Delete the payment record
  const { error: dErr } = await supabase
    .from('installment_payments')
    .delete()
    .eq('id', paymentId)
    .eq('company_id', companyId)

  if (dErr) throw dErr

  // Recalculate installment
  const installment = await recalculateInstallment(paymentRow.installment_id, companyId)

  // Recalculate customer balance
  if (installment) {
    const { data: contract } = await supabase
      .from('contracts')
      .select('customer_id')
      .eq('id', installment.contract_id)
      .single()

    if (contract) {
      await updateCustomerBalance(contract.customer_id, companyId)
    }
  }
}
