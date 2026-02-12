import { jsPDF } from 'jspdf'
import { numberToPortugueseWords } from './number-to-words'
import { formatCPF } from '@/lib/format'
import type { Contract, ContractInstallment, Customer } from '@/types/database'
import type { AddressRow } from '@/lib/supabase/customers'

// ──────────────────────────── Types ──────────────────────────────

export type ContractPdfData = {
  contract: Contract
  customer: Customer
  address: AddressRow | null
  installments: ContractInstallment[]
}

// ──────────────────────────── Constants ──────────────────────────

const COMPANY = {
  name: 'Lebon Serviços de Cobrança - LTDA',
  fullName: 'Lebon Serviços de Cobrança Ltda.',
  cnpj: '30.082.816/0001-72',
  street: 'Rua Nicolau Leonardo, 155',
  neighbourhood: 'JD Rainha',
  cep: '06656-480',
  city: 'Itapevi',
  state: 'São Paulo',
  phone: '11 9.7020-0447',
}

const MARITAL_STATUS_MAP: Record<number, string> = {
  1: 'Solteiro(a)',
  2: 'Casado(a)',
  3: 'Divorciado(a)',
  4: 'Viuvo(a)',
  5: 'Separado(a)',
  6: 'Uniao Estavel',
}

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN_LEFT = 20
const MARGIN_RIGHT = 20
const MARGIN_TOP = 15
const MARGIN_BOTTOM = 30
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT
const FOOTER_Y = PAGE_HEIGHT - 15

const MONTHS = [
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

// ──────────────────────────── Helpers ────────────────────────────

function formatDateBR(isoDate: string | null): string {
  if (!isoDate) return '—'
  const parts = isoDate.split('-')
  if (parts.length !== 3) return isoDate
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function formatCurrencyBR(value: number | null): string {
  if (value == null) return 'R$ 0,00'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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

function getDueDay(firstDueDate: string | null): string {
  if (!firstDueDate) return '—'
  const d = new Date(firstDueDate + 'T00:00:00')
  return String(d.getDate())
}

// ──────────────────────────── PDF Generator ─────────────────────

export function generateContractPdf(data: ContractPdfData): void {
  const { contract, customer, address } = data
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  let y = MARGIN_TOP

  // ── Helpers ──

  function addFooter(): void {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)

    const footerLine1 = `${COMPANY.fullName}`
    const footerLine2 = `${COMPANY.street} - ${COMPANY.neighbourhood} - ${COMPANY.cep}`
    const footerLine3 = `${COMPANY.city} - ${COMPANY.state}`
    const footerLine4 = `Contato: ${COMPANY.phone}`

    const footerX = PAGE_WIDTH - MARGIN_RIGHT

    doc.text(footerLine1, footerX, FOOTER_Y - 8, { align: 'right' })
    doc.text(footerLine2, footerX, FOOTER_Y - 4, { align: 'right' })
    doc.text(footerLine3, footerX, FOOTER_Y, { align: 'right' })
    doc.text(footerLine4, footerX, FOOTER_Y + 4, { align: 'right' })

    doc.setFont('helvetica', 'normal')
  }

  function addHeader(): void {
    // Company name
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text(COMPANY.fullName, PAGE_WIDTH / 2, y, { align: 'center' })
    y += 10

    // Title
    doc.setFontSize(13)
    doc.text('INSTRUMENTO PARTICULAR DE CONFISSAO DE DIVIDA', PAGE_WIDTH / 2, y, { align: 'center' })
    y += 12

    // Contract number
    doc.setFontSize(11)
    doc.text(`Contrato n\u00BA ${contract.contract_number ?? '—'}`, PAGE_WIDTH / 2, y, { align: 'center' })
    y += 10
  }

  function checkPageBreak(needed: number): void {
    if (y + needed > PAGE_HEIGHT - MARGIN_BOTTOM) {
      addFooter()
      doc.addPage()
      y = MARGIN_TOP
      addPageHeader()
    }
  }

  function addPageHeader(): void {
    // Repeated header on subsequent pages
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text(COMPANY.fullName, PAGE_WIDTH / 2, y, { align: 'center' })
    y += 10

    doc.setFontSize(13)
    doc.text('INSTRUMENTO PARTICULAR DE CONFISSAO DE DIVIDA', PAGE_WIDTH / 2, y, { align: 'center' })
    y += 12

    doc.setFontSize(11)
    doc.text(`Contrato n\u00BA ${contract.contract_number ?? '—'}`, PAGE_WIDTH / 2, y, { align: 'center' })
    y += 10

    doc.setFont('helvetica', 'normal')
  }

  function addWrappedText(
    text: string,
    fontSize: number,
    fontStyle: 'normal' | 'bold' = 'normal',
    lineHeight: number = 5.5
  ): void {
    doc.setFont('helvetica', fontStyle)
    doc.setFontSize(fontSize)
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH) as string[]

    for (const line of lines) {
      checkPageBreak(lineHeight + 2)
      doc.text(line, MARGIN_LEFT, y)
      y += lineHeight
    }
  }

  /** Add text with inline bold segments marked with ** */
  function addRichText(
    text: string,
    fontSize: number,
    lineHeight: number = 5.5
  ): void {
    doc.setFontSize(fontSize)

    const fullPlain = text.replace(/\*\*/g, '')

    // Get wrapped lines from the plain version for correct line breaking
    const wrappedLines = doc.splitTextToSize(fullPlain, CONTENT_WIDTH) as string[]

    // For simplicity: render as plain text with bold words
    // Rebuild each line tracking bold segments
    let remainingText = text
    for (const line of wrappedLines) {
      checkPageBreak(lineHeight + 2)

      // Find this line's content in the remaining rich text
      let x = MARGIN_LEFT
      let lineRemaining = line

      while (lineRemaining.length > 0) {
        // Find the next bold segment position
        const boldStart = remainingText.indexOf('**')

        if (boldStart === -1) {
          // No more bold, render rest as normal
          doc.setFont('helvetica', 'normal')
          doc.text(lineRemaining, x, y)
          remainingText = remainingText.substring(lineRemaining.length)
          break
        }

        // Text before bold
        const plainBeforeBold = remainingText.substring(0, boldStart).replace(/\*\*/g, '')

        if (lineRemaining.startsWith(plainBeforeBold) && plainBeforeBold.length > 0) {
          doc.setFont('helvetica', 'normal')
          doc.text(plainBeforeBold, x, y)
          x += doc.getTextWidth(plainBeforeBold)
          lineRemaining = lineRemaining.substring(plainBeforeBold.length)
          remainingText = remainingText.substring(boldStart)
        }

        // Now at a ** marker
        if (remainingText.startsWith('**')) {
          const endBold = remainingText.indexOf('**', 2)
          if (endBold === -1) break
          const boldContent = remainingText.substring(2, endBold)
          const boldInLine = lineRemaining.startsWith(boldContent)
            ? boldContent
            : lineRemaining.substring(0, boldContent.length)

          if (lineRemaining.startsWith(boldInLine) && boldInLine.length > 0) {
            doc.setFont('helvetica', 'bold')
            doc.text(boldInLine, x, y)
            x += doc.getTextWidth(boldInLine)
            lineRemaining = lineRemaining.substring(boldInLine.length)

            if (boldInLine === boldContent) {
              remainingText = remainingText.substring(endBold + 2)
            } else {
              // Bold spans to next line
              remainingText = '**' + boldContent.substring(boldInLine.length) + '**' + remainingText.substring(endBold + 2)
            }
          } else {
            // Fallback: render as normal
            doc.setFont('helvetica', 'normal')
            doc.text(lineRemaining, x, y)
            // Advance remainingText
            const plainLine = lineRemaining
            // Skip past these chars in remainingText
            let skip = 0
            let pIdx = 0
            while (pIdx < plainLine.length && skip < remainingText.length) {
              if (remainingText[skip] === '*' && remainingText[skip + 1] === '*') {
                skip += 2
                continue
              }
              if (remainingText[skip] === plainLine[pIdx]) {
                pIdx++
              }
              skip++
            }
            remainingText = remainingText.substring(skip)
            break
          }
        } else {
          // No bold marker at current position — render rest of line as normal
          doc.setFont('helvetica', 'normal')
          doc.text(lineRemaining, x, y)
          remainingText = remainingText.substring(lineRemaining.length)
          break
        }
      }

      y += lineHeight
    }

    doc.setFont('helvetica', 'normal')
  }

  function addSectionTitle(title: string): void {
    checkPageBreak(12)
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(title, MARGIN_LEFT, y)
    y += 7
    doc.setFont('helvetica', 'normal')
  }

  function addSignatureLine(label: string, extra?: string): void {
    checkPageBreak(20)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('___________________________________________', MARGIN_LEFT, y)
    y += 5
    doc.text(label, MARGIN_LEFT, y)
    if (extra) {
      y += 5
      doc.text(extra, MARGIN_LEFT, y)
    }
  }

  // ── Build document ──

  // Page 1 header
  addHeader()

  // CREDOR box
  checkPageBreak(20)
  const credorText = `**CREDOR**: **${COMPANY.name}**, pessoa juridica de direito privado, inscrito no CNPJ: **${COMPANY.cnpj}**, com sede em Rua: ${COMPANY.street}, ${COMPANY.neighbourhood}, ${COMPANY.cep}, ${COMPANY.city} - ${COMPANY.state}.`
  addRichText(credorText, 10, 5.5)
  y += 4

  // DEVEDOR
  checkPageBreak(20)
  const maritalStatus = customer.marital_status_id
    ? MARITAL_STATUS_MAP[customer.marital_status_id] ?? '—'
    : '—'
  const occupation = customer.occupation ?? '—'
  const cpfFormatted = formatCPF(customer.cpf)
  const birthDate = formatDateBR(customer.birth_date)
  const addressStr = buildAddressString(address)

  const devedorText = `**DEVEDOR**: **${customer.full_name ?? '—'}**, Brasileiro, ${maritalStatus}, ${occupation}, portador do CPF: **${cpfFormatted}** nascido em **${birthDate}**, residente e domiciliado a ${addressStr}.`
  addRichText(devedorText, 10, 5.5)
  y += 6

  // CLAUSULA 1
  addSectionTitle('CLAUSULA 1 \u2013 Objeto do Instrumento')
  addRichText(
    '**1.1.** O presente instrumento tem por objetivo a confissao de divida **DEVEDOR**, em favor do **CREDOR** referente as atividades principais e secundarias prestadas pela empresa, mediante as condicoes estabelecidas neste documento.',
    10
  )
  y += 3

  // CLAUSULA 2
  addSectionTitle('CLAUSULA 2 \u2013 Valor da Divida')
  const totalAmount = contract.contract_amount ?? contract.total_amount ?? 0
  const totalFormatted = formatCurrencyBR(totalAmount)
  const totalWords = numberToPortugueseWords(totalAmount)
  addRichText(
    `**2.1.** O **DEVEDOR** confessa que deve ao **CREDOR** a quantia total de **${totalFormatted}** (${totalWords}).`,
    10
  )
  y += 3

  // CLAUSULA 3
  addSectionTitle('CLAUSULA 3 \u2013 Condicoes de Pagamento')
  const installmentCount = contract.installments_count ?? 0
  const installmentAmount = contract.installment_amount ?? 0
  const installmentFormatted = formatCurrencyBR(installmentAmount)
  const installmentWords = numberToPortugueseWords(installmentAmount)
  const firstDueFormatted = formatDateBR(contract.first_due_date)
  const dueDay = getDueDay(contract.first_due_date)
  const customerName = customer.full_name ?? '—'

  addRichText(
    `**3.1.** O **DEVEDOR** se compromete a pagar a divida em **${installmentCount} Titulos** mensais, iguais e sucessivas, no valor de **${installmentFormatted}** (${installmentWords}) cada, vencendo a primeira em **${firstDueFormatted}** e as demais todo dia **${dueDay} de cada mes** de cada mes.`,
    10
  )
  y += 3

  addRichText(
    `**3.2.** O pagamento das parcelas sera realizado por meio de boletos bancarios, que serao enviadas ao **DEVEDOR** com antecedencia minima de 2 (dois) dias antes do vencimento. Emitidas em nome de **${customerName}**.`,
    10
  )
  y += 3

  // CLAUSULA 4
  addSectionTitle('CLAUSULA 4 \u2013 Inadimplemento')
  addRichText(
    '**4.1.** Em caso de inadimplemento por parte do **DEVEDOR**, o **CREDOR** se reserva o direito de:',
    10
  )
  y += 2
  addWrappedText('a) aplicar multa de 10% sobre o valor da parcela em atraso;', 10)
  y += 1
  addWrappedText('b) cobrar juros de 2% ao mes sobre o valor da parcela em atraso, calculados para data dia;', 10)
  y += 1
  addWrappedText('c) Correcao monetaria, custas processuais e honorarios advocaticios no percentual de 20% sobre o valor total do debito;', 10)
  y += 1
  addWrappedText('d) considerar antecipadas todas as parcelas vincendas, tornando-se exigiveis imediatamente.', 10)
  y += 3

  addRichText(
    '**4.2.** O **DEVEDOR** sera notificado sobre o inadimplemento e tera o prazo de 10 dias para regularizar a situacao, sob pena de rescisao do presente instrumento, bem como de eventual processo judicial.',
    10
  )
  y += 3

  // CLAUSULA 5
  addSectionTitle('CLAUSULA 5 \u2013 Rescisao do Instrumento')
  addRichText(
    '**5.1.** O presente instrumento podera ser rescindido pelo **CREDOR**, mediante notificacao, na hipotese de inadimplemento de qualquer clausula deste instrumento.',
    10
  )
  y += 3
  addRichText(
    '**5.2.** Em caso de rescisao, o **DEVEDOR** devera quitar todas as parcelas devidas ate a data da rescisao, incluindo multas e juros, se houver.',
    10
  )
  y += 3

  // CLAUSULA 6
  addSectionTitle('CLAUSULA 6 \u2013 Processo Judicial')
  addRichText(
    '**6.1.** As partes concordam que, em caso de necessidade de processo judicial para a cobranca de valores devidos, o foro competente sera o da comarca de Itapevi, renunciando a qualquer outro, por mais privilegiado que seja.',
    10
  )
  y += 3

  // CLAUSULA 7
  addSectionTitle('CLAUSULA 7 \u2013 Disposicoes Gerais')
  addRichText(
    '**7.1.** Este instrumento entra em vigor na data de sua assinatura e tera validade ate a quitacao total das obrigacoes assumidas.',
    10
  )
  y += 3
  addRichText(
    '**7.2.** Qualquer alteracao neste instrumento devera ser feita por escrito e assinada por ambas as partes.',
    10
  )
  y += 3
  addRichText(
    '**7.3.** As partes declaram que leram e compreenderam todas as clausulas deste instrumento, aceitando-as integralmente',
    10
  )
  y += 6

  // Closing
  checkPageBreak(15)
  addWrappedText(
    'E, por estarem assim justas e contratadas, firmam o presente instrumento em duas vias de igual teor e forma.',
    10
  )
  y += 5
  addWrappedText(
    'Para dirimir qualquer duvida oriunda deste instrumento fica eleito o foro de Itapevi.',
    10
  )
  y += 8

  // Date
  checkPageBreak(10)
  const today = new Date()
  const dateStr = `Itapevi, ${today.getDate()} de ${MONTHS[today.getMonth()]} de ${today.getFullYear()}`
  doc.setFontSize(10)
  doc.text(dateStr, PAGE_WIDTH - MARGIN_RIGHT, y, { align: 'right' })
  y += 10

  // Signatures
  addSignatureLine(
    `${COMPANY.name}`,
    `CNPJ: ${COMPANY.cnpj}`
  )
  y += 5

  addSignatureLine(
    `Devedor: ${customerName}`,
    `CPF: ${cpfFormatted}`
  )

  // Add footer on all pages
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addFooter()
  }

  // Download
  const safeName = (customer.full_name ?? 'contrato')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
  const contractNum = contract.contract_number ?? 'sem_numero'
  doc.save(`Contrato_${safeName}_${contractNum}.pdf`)
}
