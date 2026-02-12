import { jsPDF } from 'jspdf'
import type { Contract } from '@/types/database'

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

export type QuitacaoPdfData = {
  contract: Contract
  customerName: string
}

export type GenerateQuitacaoPdfOptions = { returnBlob?: boolean }

export function generateQuitacaoPdf(
  data: QuitacaoPdfData,
  options?: GenerateQuitacaoPdfOptions
): void | { blob: Blob; filename: string } {
  const { contract, customerName } = data
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  let y = MARGIN_TOP

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(COMPANY.fullName, PAGE_WIDTH / 2, y, { align: 'center' })
  y += 10

  doc.setFontSize(14)
  doc.text('TERMO DE QUITAÇÃO', PAGE_WIDTH / 2, y, { align: 'center' })
  y += 14

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)

  const today = new Date()
  const dateStr = `${today.getDate()} de ${MONTHS[today.getMonth()]} de ${today.getFullYear()}`

  const contractNum = contract.contract_number ?? '—'
  const text1 = `Pelo presente instrumento, **Lebon Serviços de Cobrança Ltda.**, CNPJ ${COMPANY.cnpj}, com sede em ${COMPANY.street}, ${COMPANY.neighbourhood}, ${COMPANY.cep}, ${COMPANY.city}/${COMPANY.state}, declara que o(a) **${customerName}** quitou integralmente as obrigações referentes ao **Contrato nº ${contractNum}**, inclusive parcelas, juros e encargos, estando o referido contrato **encerrado** na data de ${dateStr}.`
  const lines1 = doc.splitTextToSize(text1.replace(/\*\*/g, ''), CONTENT_WIDTH) as string[]
  lines1.forEach((line) => {
    doc.text(line, MARGIN_LEFT, y)
    y += 6
  })

  y += 10
  doc.text('Nada mais havendo a declarar, lavra-se o presente termo para que produza seus efeitos.', MARGIN_LEFT, y)
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
  const filename = `Termo_Quitacao_${contractNum}_${safeName}.pdf`

  if (options?.returnBlob) {
    return { blob: doc.output('blob') as Blob, filename }
  }
  doc.save(filename)
}
