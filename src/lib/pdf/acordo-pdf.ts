import { jsPDF } from 'jspdf'
import { formatCPF } from '@/lib/format'
import type { Contract, ContractInstallment, Customer } from '@/types/database'
import type { AddressRow } from '@/lib/supabase/customers'

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
const MARGIN_BOTTOM = 25
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

export type AcordoPdfData = {
  contract: Contract
  customer: Customer
  address: AddressRow | null
  /** Novas parcelas geradas pelo acordo (origin_id = RENEGOTIATION). */
  agreementInstallments: ContractInstallment[]
  /** Saldo devedor no momento do acordo (soma das novas parcelas). */
  outstandingBalance: number
}

export type GenerateAcordoPdfOptions = { returnBlob?: boolean }

function formatDateBR(isoDate: string | null): string {
  if (!isoDate) return '—'
  const parts = isoDate.split('-')
  if (parts.length !== 3) return isoDate
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function formatCurrency(value: number | null): string {
  if (value == null) return 'R$ 0,00'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function customerDisplayName(c: Customer): string {
  return c.full_name || c.legal_name || c.trade_name || '—'
}

function customerDocument(c: Customer): string {
  if (c.cpf) return `CPF ${formatCPF(c.cpf)}`
  if (c.cnpj) return `CNPJ ${c.cnpj}`
  return '—'
}

function buildAddressString(address: AddressRow | null): string {
  if (!address) return '—'
  const parts: string[] = []
  if (address.street) parts.push(address.street)
  if (address.number) parts.push(address.number)
  if (address.neighbourhood) parts.push(address.neighbourhood)
  if (address.city) parts.push(address.city)
  if (address.state) parts.push(address.state)
  if (address.zip_code) parts.push('CEP: ' + address.zip_code)
  return parts.length > 0 ? parts.join(', ') : '—'
}

export function generateAcordoPdf(
  data: AcordoPdfData,
  options?: GenerateAcordoPdfOptions
): void | { blob: Blob; filename: string } {
  const { contract, customer, address, agreementInstallments, outstandingBalance } = data
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const today = new Date()
  const dateStr = `${today.getDate()} de ${MONTHS[today.getMonth()]} de ${today.getFullYear()}`
  const contractNum = contract.contract_number ?? contract.id.slice(0, 8)
  const customerName = customerDisplayName(customer)
  const customerDoc = customerDocument(customer)
  const customerAddress = buildAddressString(address)

  let y = MARGIN_TOP

  // Cabeçalho
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(COMPANY.fullName, PAGE_WIDTH / 2, y, { align: 'center' })
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`CNPJ ${COMPANY.cnpj}`, PAGE_WIDTH / 2, y, { align: 'center' })
  y += 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('INSTRUMENTO PARTICULAR DE', PAGE_WIDTH / 2, y, { align: 'center' })
  y += 6
  doc.text('ACORDO DE RENEGOCIAÇÃO DE DÍVIDA', PAGE_WIDTH / 2, y, { align: 'center' })
  y += 12

  // Partes
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)

  const partesTxt = `Pelo presente instrumento particular, de um lado, ${COMPANY.fullName}, CNPJ ${COMPANY.cnpj}, com sede em ${COMPANY.street}, ${COMPANY.neighbourhood}, ${COMPANY.cep}, ${COMPANY.city}/${COMPANY.state}, doravante denominada CREDORA; e de outro lado ${customerName}, ${customerDoc}, residente em ${customerAddress}, doravante denominado(a) DEVEDOR(A), têm entre si justo e acordado o presente acordo de renegociação, referente ao Contrato nº ${contractNum}, sob as seguintes condições:`
  const partesLines = doc.splitTextToSize(partesTxt, CONTENT_WIDTH) as string[]
  partesLines.forEach((line) => {
    doc.text(line, MARGIN_LEFT, y)
    y += 5.5
  })
  y += 4

  // Contrato original
  doc.setFont('helvetica', 'bold')
  doc.text('1. DO CONTRATO ORIGINAL', MARGIN_LEFT, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  const originalVal = Number(contract.total_amount ?? contract.contract_amount ?? 0)
  const origemLinhas = [
    `Contrato nº ${contractNum}, celebrado em ${formatDateBR(contract.inclusion_date ?? contract.created_at ?? null)}.`,
    `Valor original do contrato: ${formatCurrency(originalVal)}.`,
    `Saldo devedor no momento deste acordo: ${formatCurrency(outstandingBalance)}.`,
  ]
  origemLinhas.forEach((l) => {
    doc.text(l, MARGIN_LEFT, y)
    y += 5.5
  })
  y += 4

  // Novas condições
  doc.setFont('helvetica', 'bold')
  doc.text('2. DAS NOVAS CONDIÇÕES DE PAGAMENTO', MARGIN_LEFT, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  const condTxt = `O(a) DEVEDOR(A) pagará à CREDORA a quantia de ${formatCurrency(outstandingBalance)} em ${agreementInstallments.length} parcela(s), conforme cronograma abaixo:`
  const condLines = doc.splitTextToSize(condTxt, CONTENT_WIDTH) as string[]
  condLines.forEach((line) => {
    doc.text(line, MARGIN_LEFT, y)
    y += 5.5
  })
  y += 3

  // Tabela de parcelas
  y = renderInstallmentsTable(doc, agreementInstallments, y)
  y += 6

  // Cláusulas
  doc.setFont('helvetica', 'bold')
  doc.text('3. DO VENCIMENTO ANTECIPADO', MARGIN_LEFT, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  const clausula3 = 'O atraso superior a 30 (trinta) dias no pagamento de qualquer das parcelas acima implicará no vencimento antecipado das parcelas vincendas, tornando exigível de imediato o saldo devedor, independente de notificação, sem prejuízo da incidência de juros e correção monetária legais.'
  const c3Lines = doc.splitTextToSize(clausula3, CONTENT_WIDTH) as string[]
  c3Lines.forEach((line) => {
    if (y > PAGE_HEIGHT - MARGIN_BOTTOM - 20) {
      doc.addPage()
      y = MARGIN_TOP
    }
    doc.text(line, MARGIN_LEFT, y)
    y += 5.5
  })
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.text('4. DA QUITAÇÃO', MARGIN_LEFT, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  const clausula4 = 'O pagamento integral das parcelas aqui pactuadas, nos termos e prazos estabelecidos, importará em quitação integral do débito originado pelo Contrato nº ' + contractNum + ', nada mais podendo ser reclamado entre as partes.'
  const c4Lines = doc.splitTextToSize(clausula4, CONTENT_WIDTH) as string[]
  c4Lines.forEach((line) => {
    if (y > PAGE_HEIGHT - MARGIN_BOTTOM - 20) {
      doc.addPage()
      y = MARGIN_TOP
    }
    doc.text(line, MARGIN_LEFT, y)
    y += 5.5
  })
  y += 10

  // Fechamento e assinaturas
  if (y > PAGE_HEIGHT - MARGIN_BOTTOM - 60) {
    doc.addPage()
    y = MARGIN_TOP
  }
  doc.text(`${COMPANY.city}, ${dateStr}.`, MARGIN_LEFT, y)
  y += 20

  // Assinatura credora
  doc.line(MARGIN_LEFT, y, MARGIN_LEFT + 80, y)
  doc.setFontSize(9)
  doc.text(COMPANY.fullName, MARGIN_LEFT, y + 5)
  doc.text('CREDORA', MARGIN_LEFT, y + 10)

  // Assinatura devedor
  doc.line(PAGE_WIDTH - MARGIN_RIGHT - 80, y, PAGE_WIDTH - MARGIN_RIGHT, y)
  doc.text(customerName, PAGE_WIDTH - MARGIN_RIGHT - 80, y + 5)
  doc.text(customerDoc, PAGE_WIDTH - MARGIN_RIGHT - 80, y + 10)
  doc.text('DEVEDOR(A)', PAGE_WIDTH - MARGIN_RIGHT - 80, y + 15)

  // Rodapé
  doc.setFontSize(8)
  doc.text(
    `${COMPANY.street} - ${COMPANY.neighbourhood} - ${COMPANY.cep} - ${COMPANY.city}/${COMPANY.state} - Tel: ${COMPANY.phone}`,
    PAGE_WIDTH / 2,
    PAGE_HEIGHT - 10,
    { align: 'center' }
  )

  const safeName = customerName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').slice(0, 30)
  const filename = `Acordo_Renegociacao_${contractNum}_${safeName}.pdf`

  if (options?.returnBlob) {
    return { blob: doc.output('blob') as Blob, filename }
  }
  doc.save(filename)
}

function renderInstallmentsTable(
  doc: jsPDF,
  installments: ContractInstallment[],
  startY: number
): number {
  const colX = [MARGIN_LEFT, MARGIN_LEFT + 20, MARGIN_LEFT + 75, MARGIN_LEFT + 120]
  const rowH = 6
  let y = startY

  // Cabeçalho
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setFillColor(241, 244, 248)
  doc.rect(MARGIN_LEFT, y - 4, CONTENT_WIDTH, rowH, 'F')
  doc.text('Nº', colX[0] + 2, y)
  doc.text('Vencimento', colX[1] + 2, y)
  doc.text('Valor', colX[2] + 2, y)
  doc.text('Saldo', colX[3] + 2, y)
  y += rowH

  // Linhas
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  installments.forEach((inst) => {
    if (y > PAGE_HEIGHT - MARGIN_BOTTOM - 10) {
      doc.addPage()
      y = MARGIN_TOP + 6
    }
    const amount = Number(inst.amount)
    const paid = Number(inst.amount_paid ?? 0)
    const openAmount = amount - paid
    doc.text(String(inst.installment_number), colX[0] + 2, y)
    doc.text(formatDateBR(inst.due_date), colX[1] + 2, y)
    doc.text(formatCurrency(amount), colX[2] + 2, y)
    doc.text(formatCurrency(openAmount), colX[3] + 2, y)
    y += rowH
  })

  return y
}
