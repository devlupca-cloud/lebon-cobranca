import { createClient } from '@/lib/supabase/client'
import type { InstallmentPayment } from '@/types/database'
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

// ──────────────────────────── Record payment (RPC única) ──────────────────────

/** Registra pagamento via RPC no Supabase: insert + recalc parcela + fechar contrato + saldo cliente em uma chamada. */
export async function recordPayment(
  input: RecordPaymentInput
): Promise<InstallmentPayment> {
  const supabase = createClient()

  let receivedByUserId = input.received_by_user_id ?? null
  if (receivedByUserId == null) {
    const { data: { user } } = await supabase.auth.getUser()
    receivedByUserId = user?.id ?? null
  }
  if (receivedByUserId == null) {
    throw new Error('Usuário não autenticado. Não é possível registrar o pagamento.')
  }

  const paidAt = input.paid_at ?? new Date().toISOString().split('T')[0]

  const { data, error } = await supabase.rpc('record_payment', {
    p_company_id: input.company_id,
    p_installment_id: input.installment_id,
    p_paid_amount: input.paid_amount,
    p_paid_at: paidAt,
    p_payment_method_id: input.payment_method_id,
    p_received_by_user_id: receivedByUserId,
    p_reference: input.reference ?? null,
    p_notes: input.notes ?? null,
  })

  if (error) throw error
  if (data == null) throw new Error('Resposta vazia ao registrar pagamento.')

  return data as InstallmentPayment
}

/** Quita o contrato: marca todas as parcelas em aberto como pagas (uma RPC no backend) e fecha o contrato. */
export async function quitContract(
  contractId: string,
  companyId: string,
  paymentMethodId: number = 1
): Promise<{ payments_count: number; closed: boolean }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('quit_contract', {
    p_contract_id: contractId,
    p_company_id: companyId,
    p_payment_method_id: paymentMethodId,
  })
  if (error) throw error
  if (data == null) throw new Error('Resposta vazia ao quitar contrato.')
  return data as { payments_count: number; closed: boolean }
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

/** Estorna um pagamento via RPC: uma única chamada (delete + recalc parcela + saldo cliente). */
export async function deletePayment(
  paymentId: string,
  companyId: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('revert_payment', {
    p_payment_id: paymentId,
    p_company_id: companyId,
  })
  if (error) throw error
}
