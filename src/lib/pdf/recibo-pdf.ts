import { jsPDF } from 'jspdf'
import { formatCPF } from '@/lib/format'
import type { Contract, ContractInstallment, Customer, InstallmentPayment } from '@/types/database'
import { PAYMENT_METHOD } from '@/types/enums'

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
const PAGE_HEIGHT = 297
const MARGIN_LEFT = 20
const MARGIN_RIGHT = 20
const MARGIN_TOP = 20
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

const PAYMENT_METHOD_LABELS: Record<number, string> = {
  [PAYMENT_METHOD.CASH]: 'Dinheiro',
  [PAYMENT_METHOD.PIX]: 'PIX',
  [PAYMENT_METHOD.BANK_TRANSFER]: 'Transferência bancária',
  [PAYMENT_METHOD.CARD]: 'Cartão',
  [PAYMENT_METHOD.BOLETO]: 'Boleto',
}

export type ReciboPdfData = {
  contract: Contract
  customer: Customer
  installment: ContractInstallment
  payment: InstallmentPayment
}

export type GenerateReciboPdfOptions = { returnBlob?: boolean }

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDateBR(isoDate: string | null): string {
  if (!isoDate) return '—'
  const parts = isoDate.split('T')[0].split('-')
  if (parts.length !== 3) return isoDate
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function customerDisplayName(c: Customer): string {
  return c.full_name || c.legal_name || c.trade_name || '—'
}

function customerDocument(c: Customer): string {
  if (c.cpf) return `CPF ${formatCPF(c.cpf)}`
  if (c.cnpj) return `CNPJ ${c.cnpj}`
  return '—'
}

/** Converte valor numérico em texto por extenso em reais (para recibos). */
function valorPorExtenso(valor: number): string {
  const reais = Math.floor(valor)
  const centavos = Math.round((valor - reais) * 100)
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']
  const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

  function ateMil(n: number): string {
    if (n === 0) return ''
    if (n === 100) return 'cem'
    const c = Math.floor(n / 100)
    const resto = n % 100
    const d = Math.floor(resto / 10)
    const u = resto % 10
    const parts: string[] = []
    if (c > 0) parts.push(centenas[c])
    if (d === 1) parts.push(especiais[u])
    else {
      if (d >= 2) parts.push(dezenas[d])
      if (u > 0 && d !== 1) {
        if (parts.length > 0 && d >= 2) parts.push('e ' + unidades[u])
        else parts.push(unidades[u])
      }
    }
    return parts.join(d >= 2 && u > 0 ? ' ' : ' e ').replace(/\s+e\s+e\s+/g, ' e ')
  }

  let texto = ''
  if (reais >= 1_000_000) {
    const milhoes = Math.floor(reais / 1_000_000)
    texto += ateMil(milhoes) + (milhoes === 1 ? ' milhão ' : ' milhões ')
  }
  const resto = reais % 1_000_000
  if (resto >= 1000) {
    const milhar = Math.floor(resto / 1000)
    texto += (milhar === 1 ? 'mil ' : ateMil(milhar) + ' mil ')
  }
  const ultimos = resto % 1000
  if (ultimos > 0) texto += ateMil(ultimos)

  texto = texto.trim() + (reais === 1 ? ' real' : ' reais')
  if (centavos > 0) {
    texto += ' e ' + ateMil(centavos) + (centavos === 1 ? ' centavo' : ' centavos')
  }
  return texto.replace(/\s+/g, ' ').trim()
}

export function generateReciboPdf(
  data: ReciboPdfData,
  options?: GenerateReciboPdfOptions
): void | { blob: Blob; filename: string } {
  const { contract, customer, installment, payment } = data
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const paidAmount = Number(payment.paid_amount)
  const methodLabel = PAYMENT_METHOD_LABELS[payment.payment_method_id] ?? 'Outro'
  const contractNum = contract.contract_number ?? contract.id.slice(0, 8)
  const customerName = customerDisplayName(customer)
  const customerDoc = customerDocument(customer)

  const today = new Date()
  const todayStr = `${today.getDate()} de ${MONTHS[today.getMonth()]} de ${today.getFullYear()}`

  let y = MARGIN_TOP

  // Cabeçalho
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(COMPANY.fullName, PAGE_WIDTH / 2, y, { align: 'center' })
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`CNPJ ${COMPANY.cnpj} · ${COMPANY.street}, ${COMPANY.neighbourhood}, ${COMPANY.city}/${COMPANY.state}`, PAGE_WIDTH / 2, y, { align: 'center' })
  y += 14

  // Título
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('RECIBO DE PAGAMENTO', PAGE_WIDTH / 2, y, { align: 'center' })
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(`Valor: ${formatCurrency(paidAmount)}`, PAGE_WIDTH / 2, y + 6, { align: 'center' })
  y += 16

  // Corpo
  doc.setFontSize(11)
  const texto = `Recebemos de ${customerName}, ${customerDoc}, a importância de ${formatCurrency(paidAmount)} (${valorPorExtenso(paidAmount)}), referente ao pagamento da parcela nº ${installment.installment_number} do Contrato nº ${contractNum}, com vencimento em ${formatDateBR(installment.due_date)}, recebida por ${methodLabel}${payment.notes ? `. Observação: ${payment.notes}` : ''}.`
  const linhas = doc.splitTextToSize(texto, CONTENT_WIDTH) as string[]
  linhas.forEach((line) => {
    doc.text(line, MARGIN_LEFT, y)
    y += 6
  })
  y += 6

  doc.text(`Data do pagamento: ${formatDateBR(payment.paid_at)}`, MARGIN_LEFT, y)
  y += 10

  doc.text('Para clareza e validade do presente recibo, firmamos o presente.', MARGIN_LEFT, y)
  y += 12

  doc.text(`${COMPANY.city}, ${todayStr}.`, MARGIN_LEFT, y)
  y += 22

  // Assinatura
  doc.line(MARGIN_LEFT, y, MARGIN_LEFT + 90, y)
  doc.setFontSize(9)
  doc.text(COMPANY.fullName, MARGIN_LEFT, y + 5)
  doc.text(`CNPJ ${COMPANY.cnpj}`, MARGIN_LEFT, y + 10)

  // Rodapé
  doc.setFontSize(8)
  doc.text(
    `${COMPANY.street} - ${COMPANY.neighbourhood} - ${COMPANY.cep} - ${COMPANY.city}/${COMPANY.state} - Tel: ${COMPANY.phone}`,
    PAGE_WIDTH / 2,
    PAGE_HEIGHT - 10,
    { align: 'center' }
  )

  const safeName = customerName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').slice(0, 30)
  const filename = `Recibo_Parcela${installment.installment_number}_${contractNum}_${safeName}.pdf`

  if (options?.returnBlob) {
    return { blob: doc.output('blob') as Blob, filename }
  }
  doc.save(filename)
}
