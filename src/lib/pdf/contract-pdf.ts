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
  4: 'Viúvo(a)',
  5: 'Separado(a)',
  6: 'União Estável',
}

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN_LEFT = 20
const MARGIN_RIGHT = 20
const MARGIN_TOP = 15
const MARGIN_BOTTOM = 32
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT
const FOOTER_Y = PAGE_HEIGHT - 15

// Marca d'água (logo Lebon Cobrança circular)
const WATERMARK_SIZE = 110 // mm
const WATERMARK_OPACITY = 0.12

// Logo MO no rodapé
const LOGO_MO_WIDTH = 22 // mm
const LOGO_MO_HEIGHT = 22 // mm

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
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

async function loadImageAsDataURL(path: string): Promise<string> {
  const res = await fetch(path)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error(`Falha ao carregar imagem: ${path}`))
    reader.readAsDataURL(blob)
  })
}

// ──────────────────────────── PDF Generator ─────────────────────

export type GenerateContractPdfOptions = { returnBlob?: boolean }

export async function generateContractPdf(
  data: ContractPdfData,
  options?: GenerateContractPdfOptions
): Promise<void | { blob: Blob; filename: string }> {
  const { contract, customer, address } = data
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // Carrega imagens (marca d'água + logo MO)
  const [watermarkDataUrl, logoMoDataUrl] = await Promise.all([
    loadImageAsDataURL('/pdf/watermark-lebon.jpg'),
    loadImageAsDataURL('/pdf/logo-mo.jpg'),
  ])

  let y = MARGIN_TOP

  // ── Helpers ──

  function addWatermark(): void {
    const x = (PAGE_WIDTH - WATERMARK_SIZE) / 2
    const yPos = (PAGE_HEIGHT - WATERMARK_SIZE) / 2
    const GStateCtor = (doc as unknown as {
      GState: new (opts: { opacity: number }) => unknown
    }).GState
    doc.setGState(new GStateCtor({ opacity: WATERMARK_OPACITY }))
    doc.addImage(watermarkDataUrl, 'JPEG', x, yPos, WATERMARK_SIZE, WATERMARK_SIZE)
    doc.setGState(new GStateCtor({ opacity: 1 }))
  }

  function addFooter(): void {
    // Logo MO no canto esquerdo
    doc.addImage(
      logoMoDataUrl,
      'JPEG',
      MARGIN_LEFT - 4,
      PAGE_HEIGHT - LOGO_MO_HEIGHT - 6,
      LOGO_MO_WIDTH,
      LOGO_MO_HEIGHT
    )

    // Dados da empresa no canto direito (italic bold)
    doc.setFont('helvetica', 'bolditalic')
    doc.setFontSize(9)

    const footerLine1 = COMPANY.fullName
    const footerLine2 = `${COMPANY.street} - ${COMPANY.neighbourhood} - ${COMPANY.cep}`
    const footerLine3 = `${COMPANY.city} - ${COMPANY.state}`
    const footerLine4 = `Contato: ${COMPANY.phone}`

    const footerX = PAGE_WIDTH - MARGIN_RIGHT

    doc.text(footerLine1, footerX, FOOTER_Y - 10, { align: 'right' })
    doc.text(footerLine2, footerX, FOOTER_Y - 6, { align: 'right' })
    doc.text(footerLine3, footerX, FOOTER_Y - 2, { align: 'right' })
    doc.text(footerLine4, footerX, FOOTER_Y + 2, { align: 'right' })

    doc.setFont('helvetica', 'normal')
  }

  function addPageDecorations(): void {
    addWatermark()
  }

  function addHeader(): void {
    // Nome da empresa
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text(COMPANY.fullName, PAGE_WIDTH / 2, y, { align: 'center' })
    y += 9

    // Título
    doc.setFontSize(13)
    doc.text('INSTRUMENTO PARTICULAR DE CONFISSÃO DE DÍVIDA', PAGE_WIDTH / 2, y, { align: 'center' })
    y += 12

    // Número do contrato dentro de uma caixa com borda leve
    const boxY = y - 5
    const boxHeight = 9
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.3)
    doc.rect(MARGIN_LEFT, boxY, CONTENT_WIDTH, boxHeight)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(
      `Contrato nº ${contract.contract_number ?? '—'}`,
      PAGE_WIDTH / 2,
      boxY + 6,
      { align: 'center' }
    )
    y = boxY + boxHeight + 8

    doc.setFont('helvetica', 'normal')
  }

  function checkPageBreak(needed: number): void {
    if (y + needed > PAGE_HEIGHT - MARGIN_BOTTOM) {
      doc.addPage()
      y = MARGIN_TOP
      addPageDecorations()
      addHeader()
    }
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

  /** Texto com segmentos em negrito marcados com ** */
  function addRichText(
    text: string,
    fontSize: number,
    lineHeight: number = 5.5
  ): void {
    doc.setFontSize(fontSize)

    const fullPlain = text.replace(/\*\*/g, '')
    const wrappedLines = doc.splitTextToSize(fullPlain, CONTENT_WIDTH) as string[]

    let remainingText = text
    for (const line of wrappedLines) {
      checkPageBreak(lineHeight + 2)

      let x = MARGIN_LEFT
      let lineRemaining = line

      while (lineRemaining.length > 0) {
        const boldStart = remainingText.indexOf('**')

        if (boldStart === -1) {
          doc.setFont('helvetica', 'normal')
          doc.text(lineRemaining, x, y)
          remainingText = remainingText.substring(lineRemaining.length)
          break
        }

        const plainBeforeBold = remainingText.substring(0, boldStart).replace(/\*\*/g, '')

        if (lineRemaining.startsWith(plainBeforeBold) && plainBeforeBold.length > 0) {
          doc.setFont('helvetica', 'normal')
          doc.text(plainBeforeBold, x, y)
          x += doc.getTextWidth(plainBeforeBold)
          lineRemaining = lineRemaining.substring(plainBeforeBold.length)
          remainingText = remainingText.substring(boldStart)
        }

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
              remainingText = '**' + boldContent.substring(boldInLine.length) + '**' + remainingText.substring(endBold + 2)
            }
          } else {
            doc.setFont('helvetica', 'normal')
            doc.text(lineRemaining, x, y)
            const plainLine = lineRemaining
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

  function addSignatureLine(label: string, extra?: string, extra2?: string): void {
    checkPageBreak(22)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('___________________________________________', MARGIN_LEFT, y)
    y += 5
    doc.setFont('helvetica', 'bold')
    doc.text(label, MARGIN_LEFT, y)
    doc.setFont('helvetica', 'normal')
    if (extra) {
      y += 5
      doc.text(extra, MARGIN_LEFT, y)
    }
    if (extra2) {
      y += 5
      doc.text(extra2, MARGIN_LEFT, y)
    }
  }

  // ── Build document ──

  addPageDecorations()
  addHeader()

  // CREDOR
  checkPageBreak(20)
  const credorText = `**CREDOR**: **${COMPANY.name}**, pessoa jurídica de direito privado, inscrito no CNPJ: **${COMPANY.cnpj}**, com sede em Rua: ${COMPANY.street}, ${COMPANY.neighbourhood}, ${COMPANY.cep}, ${COMPANY.city} - ${COMPANY.state}.`
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

  const devedorText = `**DEVEDOR**: **${customer.full_name ?? '—'}**, Brasileiro(a), ${maritalStatus}, ${occupation}, portador do CPF: **${cpfFormatted}** nascido em **${birthDate}**, residente e domiciliado à ${addressStr}.`
  addRichText(devedorText, 10, 5.5)
  y += 6

  // CLÁUSULA 1
  addSectionTitle('CLÁUSULA 1 – Objeto do Instrumento')
  addRichText(
    '**1.1.** O presente instrumento tem por objetivo a confissão de dívida **DEVEDOR**, em favor do **CREDOR** referente às atividades principais e secundárias prestadas pela empresa, mediante as condições estabelecidas neste documento.',
    10
  )
  y += 3

  // CLÁUSULA 2
  addSectionTitle('CLÁUSULA 2 – Valor da Dívida')
  // Valor da dívida = total real do contrato (parcelas × qtd), não o principal simulado.
  // Prioridade: total_amount salvo > parcela × qtd > contract_amount (fallback legado).
  const parcelasXqtd =
    contract.installment_amount != null && contract.installments_count > 0
      ? contract.installment_amount * contract.installments_count
      : null
  const totalAmount =
    contract.total_amount ?? parcelasXqtd ?? contract.contract_amount ?? 0
  const totalFormatted = formatCurrencyBR(totalAmount)
  const totalWords = numberToPortugueseWords(totalAmount)
  addRichText(
    `**2.1.** O **DEVEDOR** confessa que deve ao **CREDOR** a quantia total de **${totalFormatted}** (${totalWords}).`,
    10
  )
  y += 3

  // CLÁUSULA 3
  addSectionTitle('CLÁUSULA 3 – Condições de Pagamento')
  const installmentCount = contract.installments_count ?? 0
  const installmentAmount = contract.installment_amount ?? 0
  const installmentFormatted = formatCurrencyBR(installmentAmount)
  const installmentWords = numberToPortugueseWords(installmentAmount)
  const firstDueFormatted = formatDateBR(contract.first_due_date)
  const dueDay = getDueDay(contract.first_due_date)
  const customerName = customer.full_name ?? '—'

  addRichText(
    `**3.1.** O **DEVEDOR** se compromete a pagar a dívida em **${installmentCount} Títulos** mensais, iguais e sucessivas, no valor de **${installmentFormatted}** (${installmentWords}) cada, vencendo a primeira em **${firstDueFormatted}** e as demais todo dia **${dueDay} de cada mês** de cada mês.`,
    10
  )
  y += 3

  addRichText(
    `**3.2.** O pagamento das parcelas será realizado por meio de boletos bancários, que serão enviadas ao **DEVEDOR** com antecedência mínima de 2 (dois) dias antes do vencimento. Emitidas em nome de **${customerName}**.`,
    10
  )
  y += 3

  // CLÁUSULA 4
  addSectionTitle('CLÁUSULA 4 – Inadimplemento')
  addRichText(
    '**4.1.** Em caso de inadimplemento por parte do **DEVEDOR**, o **CREDOR** se reserva o direito de:',
    10
  )
  y += 2
  addWrappedText('a) aplicar multa de 10% sobre o valor da parcela em atraso;', 10)
  y += 1
  addWrappedText('b) cobrar juros de 2% ao mês sobre o valor da parcela em atraso, calculados para data dia;', 10)
  y += 1
  addWrappedText('c) Correção monetária, custas processuais e honorários advocatícios no percentual de 20% sobre o valor total do débito;', 10)
  y += 1
  addWrappedText('d) considerar antecipadas todas as parcelas vincendas, tornando-se exigíveis imediatamente.', 10)
  y += 3

  addRichText(
    '**4.2.** O **DEVEDOR** será notificado sobre o inadimplemento e terá o prazo de 10 dias para regularizar a situação, sob pena de rescisão do presente instrumento, bem como de eventual processo judicial.',
    10
  )
  y += 3

  // CLÁUSULA 5
  addSectionTitle('CLÁUSULA 5 – Rescisão do Instrumento')
  addRichText(
    '**5.1.** O presente instrumento poderá ser rescindido pelo **CREDOR**, mediante notificação, na hipótese de inadimplemento de qualquer cláusula deste instrumento.',
    10
  )
  y += 3
  addRichText(
    '**5.2.** Em caso de rescisão, o **DEVEDOR** deverá quitar todas as parcelas devidas até a data da rescisão, incluindo multas e juros, se houver.',
    10
  )
  y += 3

  // CLÁUSULA 6
  addSectionTitle('CLÁUSULA 6 – Processo Judicial')
  addRichText(
    '**6.1.** As partes concordam que, em caso de necessidade de processo judicial para a cobrança de valores devidos, o foro competente será o da comarca de Itapevi, renunciando a qualquer outro, por mais privilegiado que seja.',
    10
  )
  y += 3

  // CLÁUSULA 7
  addSectionTitle('CLÁUSULA 7 – Disposições Gerais')
  addRichText(
    '**7.1.** Este instrumento entra em vigor na data de sua assinatura e terá validade até a quitação total das obrigações assumidas.',
    10
  )
  y += 3
  addRichText(
    '**7.2.** Qualquer alteração neste instrumento deverá ser feita por escrito e assinada por ambas as partes.',
    10
  )
  y += 3
  addRichText(
    '**7.3.** As partes declaram que leram e compreenderam todas as cláusulas deste instrumento, aceitando-as integralmente',
    10
  )
  y += 6

  // Fechamento
  checkPageBreak(15)
  addWrappedText(
    'E, por estarem assim justas e contratadas, firmam o presente instrumento em duas vias de igual teor e forma.',
    10
  )
  y += 5
  addWrappedText(
    'Para dirimir qualquer dúvida oriunda deste instrumento fica eleito o foro de Itapevi.',
    10
  )
  y += 8

  // Data
  checkPageBreak(10)
  const today = new Date()
  const dateStr = `Itapevi, ${today.getDate()} de ${MONTHS[today.getMonth()]} de ${today.getFullYear()}`
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(dateStr, PAGE_WIDTH - MARGIN_RIGHT, y, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  y += 12

  // Assinaturas
  addSignatureLine(
    COMPANY.name,
    `CNPJ: ${COMPANY.cnpj}`
  )
  y += 5

  addSignatureLine(
    `Devedor: ${customerName}`,
    `CPF: ${cpfFormatted}`
  )

  // Aplica rodapé em todas as páginas
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addFooter()
  }

  const safeName = (customer.full_name ?? 'contrato')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
  const contractNum = contract.contract_number ?? 'sem_numero'
  const filename = `Contrato_${safeName}_${contractNum}.pdf`

  if (options?.returnBlob) {
    return { blob: doc.output('blob') as Blob, filename }
  }
  doc.save(filename)
}
