/**
 * Calculo de multa e juros sobre parcelas em atraso, conforme **Clausula 4
 * do contrato** (`src/lib/pdf/contract-pdf.ts:427-433`):
 *
 *   a) multa de 10% sobre o valor da parcela em atraso (uma unica vez)
 *   b) juros de 2% ao mes sobre o valor da parcela, calculados pro-rata-dia
 *
 * Base de calculo: saldo em aberto (`amount - amount_paid`). Se o cliente
 * pagou parte, multa e juros incidem apenas sobre o restante.
 *
 * Itens (c) honorarios advocaticios 20% e (d) vencimento antecipado nao
 * sao aplicados automaticamente — sao acionados apenas em decisao judicial
 * ou comando explicito do credor.
 */

export const FINE_RATE = 0.10 // 10% multa unica
export const MONTHLY_INTEREST_RATE = 0.02 // 2% ao mes
export const DAILY_INTEREST_RATE = MONTHLY_INTEREST_RATE / 30 // pro-rata-dia (~0,0667%/dia)

export type InstallmentLike = {
  amount: number
  amount_paid: number
  due_date: string // ISO yyyy-mm-dd
}

export type OverdueValue = {
  /** Saldo em aberto antes da atualizacao: amount - amount_paid */
  amountOpen: number
  /** Dias de atraso (0 se nao esta vencida ainda) */
  daysOverdue: number
  /** Multa fixa de 10% sobre `amountOpen` (so aplicada se daysOverdue > 0) */
  fineAmount: number
  /** Juros pro-rata: amountOpen * 2% am * (dias / 30) */
  interestAmount: number
  /** Total atualizado para hoje: amountOpen + multa + juros */
  totalUpdated: number
  /** Indica se a parcela esta efetivamente em atraso */
  isOverdue: boolean
}

/**
 * Conta dias entre due_date e today (00:00 local). Retorna 0 se due_date
 * ainda nao chegou. Funciona com strings ISO `yyyy-mm-dd`.
 */
export function daysOverdue(dueDateIso: string, today: Date = new Date()): number {
  const due = new Date(dueDateIso + 'T00:00:00')
  const ref = new Date(today)
  ref.setHours(0, 0, 0, 0)
  const diffMs = ref.getTime() - due.getTime()
  if (diffMs <= 0) return 0
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Calcula valor atualizado da parcela (saldo + multa + juros).
 * Se a parcela nao esta em atraso, retorna apenas o saldo (multa=0, juros=0).
 *
 * Round: cada componente arredondado a 2 casas decimais. Total e recalculado
 * a partir das partes arredondadas para evitar discrepancia de 1 centavo.
 */
export function calculateOverdueValue(
  installment: InstallmentLike,
  today: Date = new Date()
): OverdueValue {
  const amountOpen = round2(Number(installment.amount) - Number(installment.amount_paid))
  const days = daysOverdue(installment.due_date, today)

  if (amountOpen <= 0) {
    return {
      amountOpen: 0,
      daysOverdue: 0,
      fineAmount: 0,
      interestAmount: 0,
      totalUpdated: 0,
      isOverdue: false,
    }
  }

  if (days <= 0) {
    return {
      amountOpen,
      daysOverdue: 0,
      fineAmount: 0,
      interestAmount: 0,
      totalUpdated: amountOpen,
      isOverdue: false,
    }
  }

  const fineAmount = round2(amountOpen * FINE_RATE)
  const interestAmount = round2(amountOpen * DAILY_INTEREST_RATE * days)
  const totalUpdated = round2(amountOpen + fineAmount + interestAmount)

  return {
    amountOpen,
    daysOverdue: days,
    fineAmount,
    interestAmount,
    totalUpdated,
    isOverdue: true,
  }
}

/**
 * Soma `totalUpdated` de uma lista de parcelas (com multa+juros aplicados
 * em cada uma individualmente).
 */
export function sumOverdueTotals(
  installments: InstallmentLike[],
  today: Date = new Date()
): number {
  return installments.reduce((sum, i) => sum + calculateOverdueValue(i, today).totalUpdated, 0)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
