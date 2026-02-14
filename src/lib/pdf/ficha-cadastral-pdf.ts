import { jsPDF } from 'jspdf'
import type { Contract, Customer } from '@/types/database'
import type { AddressRow } from '@/lib/supabase/customers'
import { formatCPFOrCNPJ } from '@/lib/format'

const COMPANY = {
  fullName: 'Lebon Serviços de Cobrança Ltda.',
  cnpj: '30.082.816/0001-72',
  street: 'Rua Nicolau Leonardo, 155',
  neighbourhood: 'JD Rainha',
  cep: '06656-480',
  city: 'Itapevi',
  state: 'São Paulo',
}

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 18
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const LINE_HEIGHT = 5.5
const SECTION_GAP = 4

function formatDateBR(iso: string | null): string {
  if (!iso) return '—'
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function formatCurrencyBR(value: number | null): string {
  if (value == null) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function buildAddressStr(addr: AddressRow | null): string {
  if (!addr) return '—'
  const p: string[] = []
  if (addr.street) p.push(addr.street)
  if (addr.number) p.push(addr.number)
  if (addr.neighbourhood) p.push(addr.neighbourhood)
  if (addr.city) p.push(addr.city)
  if (addr.state) p.push(addr.state)
  if (addr.zip_code) p.push(`CEP: ${addr.zip_code}`)
  return p.length ? p.join(', ') : '—'
}

function getCustomerDisplayName(c: Customer): string {
  const isPJ = c.person_type === 'juridica'
  const name = isPJ
    ? (c.legal_name ?? c.trade_name ?? c.full_name)
    : (c.full_name ?? c.legal_name ?? c.trade_name)
  return (name && String(name).trim()) ? String(name).trim() : formatCPFOrCNPJ(c.cpf, c.cnpj)
}

export type FichaCadastralPdfData = {
  contract: Contract
  customer: Customer
  customerAddress: AddressRow | null
  guarantor: Customer | null
  guarantorAddress: AddressRow | null
}

export type GenerateFichaCadastralPdfOptions = { returnBlob?: boolean }

/**
 * Gera a Ficha Cadastral – relatório com dados do contrato, cliente e fiador (se houver).
 */
export function generateFichaCadastralPdf(
  data: FichaCadastralPdfData,
  options?: GenerateFichaCadastralPdfOptions
): void | { blob: Blob; filename: string } {
  const { contract, customer, customerAddress, guarantor, guarantorAddress } = data
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = MARGIN

  function sectionTitle(title: string): void {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(30, 58, 138)
    doc.text(title, MARGIN, y)
    y += LINE_HEIGHT + 2
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
  }

  function row(label: string, value: string | number | null): void {
    const v = value != null && value !== '' ? String(value) : '—'
    doc.text(`${label}: ${v}`, MARGIN, y)
    y += LINE_HEIGHT
  }

  // Cabeçalho
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(COMPANY.fullName, PAGE_WIDTH / 2, y, { align: 'center' })
  y += 6
  doc.setFontSize(12)
  doc.text('FICHA CADASTRAL', PAGE_WIDTH / 2, y, { align: 'center' })
  y += 10

  // Contrato
  sectionTitle('DADOS DO CONTRATO')
  row('Número', contract.contract_number)
  row('Data de inclusão', formatDateBR(contract.inclusion_date))
  row('Valor do contrato', contract.contract_amount != null ? formatCurrencyBR(contract.contract_amount) : null)
  row('Quantidade de parcelas', contract.installments_count)
  row('Valor da parcela', contract.installment_amount != null ? formatCurrencyBR(contract.installment_amount) : null)
  row('Primeiro vencimento', formatDateBR(contract.first_due_date))
  row('Valor total', contract.total_amount != null ? formatCurrencyBR(contract.total_amount) : null)
  row('Banco', contract.bank)
  y += SECTION_GAP

  // Cliente (titular)
  sectionTitle('DADOS DO CLIENTE (TITULAR)')
  row('Nome/Razão Social', getCustomerDisplayName(customer))
  row('CPF/CNPJ', formatCPFOrCNPJ(customer.cpf, customer.cnpj))
  row('Tipo', customer.person_type === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física')
  if (customer.person_type === 'juridica') {
    row('Razão social', customer.legal_name)
    row('Nome fantasia', customer.trade_name)
  }
  row('Data de nascimento', formatDateBR(customer.birth_date))
  row('Profissão/Ocupação', customer.occupation)
  row('E-mail', customer.email)
  row('Telefone', customer.phone)
  row('Celular', customer.mobile)
  row('Endereço', buildAddressStr(customerAddress))
  row('Código do cliente', customer.customer_code)
  y += SECTION_GAP

  // Fiador (se houver)
  if (guarantor) {
    sectionTitle('DADOS DO FIADOR')
    row('Nome/Razão Social', getCustomerDisplayName(guarantor))
    row('CPF/CNPJ', formatCPFOrCNPJ(guarantor.cpf, guarantor.cnpj))
    row('Tipo', guarantor.person_type === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física')
    if (guarantor.person_type === 'juridica') {
      row('Razão social', guarantor.legal_name)
      row('Nome fantasia', guarantor.trade_name)
    }
    row('E-mail', guarantor.email)
    row('Telefone', guarantor.phone)
    row('Celular', guarantor.mobile)
    row('Endereço', buildAddressStr(guarantorAddress))
    y += SECTION_GAP
  }

  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text(
    `Documento gerado em ${new Date().toLocaleString('pt-BR')} - ${COMPANY.fullName} - ${COMPANY.city}/${COMPANY.state}`,
    MARGIN,
    PAGE_HEIGHT - 10
  )

  const contractNum = (contract.contract_number ?? contract.id.slice(0, 8)).replace(/[^a-zA-Z0-9-_]/g, '_')
  const filename = `Ficha_Cadastral_${contractNum}.pdf`

  if (options?.returnBlob) {
    return { blob: doc.output('blob') as Blob, filename }
  }
  doc.save(filename)
}
