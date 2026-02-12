/**
 * Cálculo de parcela (PMT) e total para simulação de contratos.
 * Fórmula: valor * (i * (1+i)^n) / ((1+i)^n - 1), i = taxa mensal decimal.
 */

export function calcularParcela(
  valorPrincipal: number,
  numParcelas: number,
  taxaMensalPercent: number
): { parcela: number; total: number } {
  if (valorPrincipal <= 0 || numParcelas <= 0) {
    return { parcela: 0, total: 0 }
  }
  const i = taxaMensalPercent / 100
  if (i <= 0) {
    const parcela = valorPrincipal / numParcelas
    return { parcela, total: valorPrincipal }
  }
  const factor = Math.pow(1 + i, numParcelas)
  const parcela = valorPrincipal * ((i * factor) / (factor - 1))
  const total = parcela * numParcelas
  return { parcela, total }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
