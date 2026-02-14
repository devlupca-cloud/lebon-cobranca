import { jsPDF } from 'jspdf'
import type { Contract } from '@/types/database'
import { formatCPFOrCNPJ } from '@/lib/format'

const COMPANY = {
  fullName: 'Lebon Serviços de Cobrança Ltda.',
  cnpj: '30.082.816/0001-72',
  street: 'Rua Nicolau Leonardo, 155',
  neighbourhood: 'JD Rainha',
  cep: '06656-480',
  city: 'Itapevi',
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

export type AnuenciaPdfData = {
  contract: Contract
  /** Nome do devedor (cliente) para exibição */
  customerName: string
  /** CPF ou CNPJ formatado do devedor */
  customerDoc: string
}

export type GenerateAnuenciaPdfOptions = { returnBlob?: boolean }

/**
 * Gera a Carta de Anuência – documento necessário para processo de cobrança junto ao cartório,
 * em que o credor declara o devedor e autoriza as medidas cabíveis.
 */
export function generateAnuenciaPdf(
  data: AnuenciaPdfData,
  options?: GenerateAnuenciaPdfOptions
): void | { blob: Blob; filename: string } {
  const { contract, customerName, customerDoc } = data
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  let y = MARGIN_TOP

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(COMPANY.fullName, PAGE_WIDTH / 2, y, { align: 'center' })
  y += 10

  doc.setFontSize(14)
  doc.text('CARTA DE ANUÊNCIA', PAGE_WIDTH / 2, y, { align: 'center' })
  y += 14

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)

  const today = new Date()
  const dateStr = `${today.getDate()} de ${MONTHS[today.getMonth()]} de ${today.getFullYear()}`
  const contractNum = contract.contract_number ?? '—'

  const para1 = `A **${COMPANY.fullName}**, CNPJ ${COMPANY.cnpj}, com sede em ${COMPANY.street}, ${COMPANY.neighbourhood}, ${COMPANY.cep}, ${COMPANY.city}/${COMPANY.state}, vem por meio da presente **CARTA DE ANUÊNCIA** declarar perante o Cartório e demais interessados o que segue:`
  const lines1 = doc.splitTextToSize(para1.replace(/\*\*/g, ''), CONTENT_WIDTH) as string[]
  lines1.forEach((line) => {
    doc.text(line, MARGIN_LEFT, y)
    y += 6
  })
  y += 6

  const para2 = `O(A) **${customerName}**, inscrito(a) no CPF/CNPJ sob o nº **${customerDoc}**, é devedor(a) perante esta empresa em virtude do **Contrato nº ${contractNum}**, celebrado entre as partes, encontrando-se em aberto as obrigações nele previstas.`
  const lines2 = doc.splitTextToSize(para2.replace(/\*\*/g, ''), CONTENT_WIDTH) as string[]
  lines2.forEach((line) => {
    doc.text(line, MARGIN_LEFT, y)
    y += 6
  })
  y += 6

  const para3 = `Dessa forma, **anuímos** e **autorizamos** que o presente documento seja utilizado para os fins de processo de cobrança junto ao cartório, inclusive para as medidas cabíveis na forma da lei, em razão do inadimplemento das obrigações contratuais pelo(a) devedor(a) acima qualificado(a).`
  const lines3 = doc.splitTextToSize(para3.replace(/\*\*/g, ''), CONTENT_WIDTH) as string[]
  lines3.forEach((line) => {
    doc.text(line, MARGIN_LEFT, y)
    y += 6
  })
  y += 10

  doc.text('E por ser a presente a expressão da verdade, lavramos o presente documento para que produza seus efeitos.', MARGIN_LEFT, y)
  y += 12

  doc.text(`${COMPANY.city}, ${dateStr}.`, MARGIN_LEFT, y)
  y += 15

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(COMPANY.fullName, MARGIN_LEFT, y)
  doc.text(`CNPJ: ${COMPANY.cnpj}`, MARGIN_LEFT, y + 5)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`${COMPANY.street} - ${COMPANY.neighbourhood} - ${COMPANY.cep} - ${COMPANY.city}/${COMPANY.state} - Tel: ${COMPANY.phone}`, MARGIN_LEFT, PAGE_HEIGHT - 15)

  const safeName = customerName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').slice(0, 30)
  const filename = `Carta_Anuencia_${contractNum}_${safeName}.pdf`

  if (options?.returnBlob) {
    return { blob: doc.output('blob') as Blob, filename }
  }
  doc.save(filename)
}
