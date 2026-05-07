import { jsPDF } from 'jspdf'
import type { CompanyExpense } from '@/types/database'

const COMPANY = {
  fullName: 'Lebon Serviços de Cobrança Ltda.',
  cnpj: '30.082.816/0001-72',
  street: 'R. Adelino Cardana, 293 - Bloco C Sala 702',
  neighbourhood: 'Centro',
  cep: '06401-147',
  city: 'Barueri',
  state: 'São Paulo',
  phone: '11 9.7020-0447',
}

const PAGE_WIDTH = 210
const MARGIN_LEFT = 15
const MARGIN_RIGHT = 15
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT

export type ContasPagarPdfData = {
  expenses: CompanyExpense[]
  /** Periodo selecionado pelo filtro (yyyy-mm) ou null se "todos". */
  periodLabel: string | null
  /** Filtro de tipo aplicado, se houver. */
  typeLabel: string | null
}

export type GenerateContasPagarPdfOptions = {
  returnBlob?: boolean
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDateBR(isoDate: string | null): string {
  if (!isoDate || isoDate.length < 10) return '—'
  const [y, m, d] = isoDate.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function getStatus(row: CompanyExpense, todayISO: string): 'paid' | 'overdue' | 'pending' {
  if (row.payment_date) return 'paid'
  if (row.due_date && row.due_date < todayISO) return 'overdue'
  return 'pending'
}

const STATUS_LABEL: Record<'paid' | 'overdue' | 'pending', string> = {
  paid: 'Pago',
  overdue: 'Atrasado',
  pending: 'Pendente',
}

/**
 * Gera PDF de relatorio de contas a pagar com totais por status.
 * Retorna nome do arquivo OU `{ blob, filename }` se `returnBlob=true`.
 */
export function generateContasPagarPdf(
  data: ContasPagarPdfData,
  options: GenerateContasPagarPdfOptions = {}
): string | { blob: Blob; filename: string } {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const todayISO = new Date().toISOString().slice(0, 10)

  // ── Cabecalho ──
  let y = 18
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Relatório de Contas a Pagar', MARGIN_LEFT, y)

  y += 7
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(COMPANY.fullName, MARGIN_LEFT, y)
  y += 4
  doc.text(`CNPJ: ${COMPANY.cnpj}`, MARGIN_LEFT, y)
  y += 4
  doc.text(
    `${COMPANY.street}, ${COMPANY.neighbourhood}, ${COMPANY.cep}, ${COMPANY.city}-${COMPANY.state}`,
    MARGIN_LEFT,
    y
  )

  y += 8
  doc.setTextColor(0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Filtros aplicados:', MARGIN_LEFT, y)
  doc.setFont('helvetica', 'normal')
  y += 5
  doc.text(`• Período: ${data.periodLabel ?? 'Todos'}`, MARGIN_LEFT + 4, y)
  y += 4
  doc.text(`• Tipo: ${data.typeLabel ?? 'Todos'}`, MARGIN_LEFT + 4, y)
  y += 4
  doc.text(
    `• Gerado em: ${new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`,
    MARGIN_LEFT + 4,
    y
  )

  // ── Totais ──
  let totalPaid = 0
  let totalOverdue = 0
  let totalPending = 0
  let countPaid = 0
  let countOverdue = 0
  let countPending = 0
  for (const row of data.expenses) {
    const status = getStatus(row, todayISO)
    if (status === 'paid') {
      totalPaid += Number(row.amount)
      countPaid += 1
    } else if (status === 'overdue') {
      totalOverdue += Number(row.amount)
      countOverdue += 1
    } else {
      totalPending += Number(row.amount)
      countPending += 1
    }
  }
  const totalGeral = totalPaid + totalOverdue + totalPending

  y += 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Resumo:', MARGIN_LEFT, y)
  y += 6

  // Cards de resumo
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const cardW = CONTENT_WIDTH / 4 - 2
  const cardH = 18
  const cards = [
    { label: 'Pago', value: totalPaid, count: countPaid, color: [36, 150, 137] as [number, number, number] },
    { label: 'Atrasado', value: totalOverdue, count: countOverdue, color: [220, 38, 38] as [number, number, number] },
    { label: 'Pendente', value: totalPending, count: countPending, color: [37, 99, 235] as [number, number, number] },
    { label: 'Total geral', value: totalGeral, count: data.expenses.length, color: [30, 58, 138] as [number, number, number] },
  ]
  cards.forEach((c, i) => {
    const x = MARGIN_LEFT + i * (cardW + 2)
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(229, 231, 235)
    doc.roundedRect(x, y, cardW, cardH, 1.5, 1.5, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...c.color)
    doc.text(c.label.toUpperCase(), x + 3, y + 5)
    doc.setTextColor(0)
    doc.setFontSize(11)
    doc.text(formatCurrency(c.value), x + 3, y + 11)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(`${c.count} conta${c.count !== 1 ? 's' : ''}`, x + 3, y + 16)
  })
  y += cardH + 8

  // ── Tabela ──
  doc.setTextColor(0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Detalhamento:', MARGIN_LEFT, y)
  y += 5

  const colX = {
    payee: MARGIN_LEFT,
    type: MARGIN_LEFT + 60,
    due: MARGIN_LEFT + 90,
    pay: MARGIN_LEFT + 115,
    amount: MARGIN_LEFT + 140,
    status: MARGIN_LEFT + 168,
  }
  const rowH = 6

  // Header
  doc.setFillColor(243, 244, 246)
  doc.rect(MARGIN_LEFT, y - 4, CONTENT_WIDTH, 6, 'F')
  doc.setFontSize(8)
  doc.setTextColor(83, 100, 113)
  doc.text('CREDOR', colX.payee, y)
  doc.text('TIPO', colX.type, y)
  doc.text('VENCIMENTO', colX.due, y)
  doc.text('PAGAMENTO', colX.pay, y)
  doc.text('VALOR', colX.amount + 22, y, { align: 'right' })
  doc.text('STATUS', colX.status, y)
  y += 4
  doc.setDrawColor(229, 231, 235)
  doc.line(MARGIN_LEFT, y, MARGIN_LEFT + CONTENT_WIDTH, y)
  y += 3

  doc.setTextColor(0)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  for (const row of data.expenses) {
    if (y > 275) {
      doc.addPage()
      y = 18
    }
    const status = getStatus(row, todayISO)
    const payeeName = row.payee_name.length > 32 ? row.payee_name.slice(0, 30) + '…' : row.payee_name
    doc.text(payeeName, colX.payee, y)
    doc.text(row.expense_type ?? 'Outros', colX.type, y)
    doc.text(formatDateBR(row.due_date), colX.due, y)
    doc.text(formatDateBR(row.payment_date), colX.pay, y)
    doc.text(formatCurrency(Number(row.amount)), colX.amount + 22, y, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    if (status === 'paid') doc.setTextColor(36, 150, 137)
    else if (status === 'overdue') doc.setTextColor(220, 38, 38)
    else doc.setTextColor(37, 99, 235)
    doc.text(STATUS_LABEL[status], colX.status, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0)
    y += rowH
  }

  if (data.expenses.length === 0) {
    doc.setTextColor(100, 100, 100)
    doc.text('Nenhuma conta no período/filtros selecionados.', MARGIN_LEFT, y + 5)
  }

  const filename = `contas-pagar-${data.periodLabel ?? 'todos'}-${Date.now()}.pdf`
  if (options.returnBlob) {
    return { blob: doc.output('blob'), filename }
  }
  doc.save(filename)
  return filename
}
