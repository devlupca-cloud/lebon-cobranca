/**
 * Cálculo de parcela (PMT) e total para simulação de contratos.
 *
 * Sistema PRICE com taxa administrativa:
 *   1. base = principal * (1 + adminFeeRate/100)
 *   2. parcela = base * (i * (1+i)^n) / ((1+i)^n - 1), i = taxaMensal/100
 *   3. total = parcela * n
 *
 * Se `adminFeeRate = 0`: comportamento PRICE puro sobre o principal.
 * Se `taxaMensal = 0`: parcela = base / n (divide a base em n vezes iguais).
 * Se ambos = 0: parcela = principal / n (sem nenhuma majoração).
 */

export function calcularParcela(
  valorPrincipal: number,
  numParcelas: number,
  taxaMensalPercent: number,
  adminFeeRatePercent: number = 0
): { parcela: number; total: number; base: number } {
  if (valorPrincipal <= 0 || numParcelas <= 0) {
    return { parcela: 0, total: 0, base: 0 }
  }
  const adminRate = Math.max(0, adminFeeRatePercent) / 100
  const base = valorPrincipal * (1 + adminRate)
  const i = taxaMensalPercent / 100
  if (i <= 0) {
    const parcela = base / numParcelas
    return { parcela, total: base, base }
  }
  const factor = Math.pow(1 + i, numParcelas)
  const parcela = base * ((i * factor) / (factor - 1))
  const total = parcela * numParcelas
  return { parcela, total, base }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
