const UNITS = [
  '', 'Um', 'Dois', 'Tres', 'Quatro', 'Cinco',
  'Seis', 'Sete', 'Oito', 'Nove', 'Dez',
  'Onze', 'Doze', 'Treze', 'Quatorze', 'Quinze',
  'Dezesseis', 'Dezessete', 'Dezoito', 'Dezenove',
]

const TENS = [
  '', '', 'Vinte', 'Trinta', 'Quarenta', 'Cinquenta',
  'Sessenta', 'Setenta', 'Oitenta', 'Noventa',
]

const HUNDREDS = [
  '', 'Cento', 'Duzentos', 'Trezentos', 'Quatrocentos', 'Quinhentos',
  'Seiscentos', 'Setecentos', 'Oitocentos', 'Novecentos',
]

function groupToWords(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'Cem'

  const parts: string[] = []
  const h = Math.floor(n / 100)
  const rest = n % 100

  if (h > 0) parts.push(HUNDREDS[h])

  if (rest > 0) {
    if (rest < 20) {
      parts.push(UNITS[rest])
    } else {
      const t = Math.floor(rest / 10)
      const u = rest % 10
      parts.push(TENS[t])
      if (u > 0) parts.push(UNITS[u])
    }
  }

  return parts.join(' E ')
}

/**
 * Converts a number to Brazilian Portuguese words for legal documents.
 * Example: 4688.04 → "Quatro Mil Seiscentos E Oitenta E Oito Reais E Quatro Centavos"
 * Supports values up to 999,999,999.99
 */
export function numberToPortugueseWords(value: number): string {
  if (value === 0) return 'Zero Reais'

  const rounded = Math.round(value * 100) / 100
  const intPart = Math.floor(rounded)
  const centsPart = Math.round((rounded - intPart) * 100)

  const parts: string[] = []

  if (intPart > 0) {
    const millions = Math.floor(intPart / 1_000_000)
    const thousands = Math.floor((intPart % 1_000_000) / 1_000)
    const remainder = intPart % 1_000

    if (millions > 0) {
      if (millions === 1) {
        parts.push('Um Milhao')
      } else {
        parts.push(groupToWords(millions) + ' Milhoes')
      }
    }

    if (thousands > 0) {
      if (thousands === 1) {
        parts.push('Mil')
      } else {
        parts.push(groupToWords(thousands) + ' Mil')
      }
    }

    if (remainder > 0) {
      // Add "E" connector if there are higher groups and remainder < 100
      // or if remainder is an exact hundred
      if ((millions > 0 || thousands > 0) && remainder < 100) {
        parts.push('E ' + groupToWords(remainder))
      } else {
        parts.push(groupToWords(remainder))
      }
    }

    parts.push(intPart === 1 ? 'Real' : 'Reais')
  }

  if (centsPart > 0) {
    if (intPart > 0) parts.push('E')

    if (centsPart < 20) {
      parts.push(UNITS[centsPart])
    } else {
      const t = Math.floor(centsPart / 10)
      const u = centsPart % 10
      const centWords: string[] = [TENS[t]]
      if (u > 0) centWords.push('E ' + UNITS[u])
      parts.push(centWords.join(' '))
    }

    parts.push(centsPart === 1 ? 'Centavo' : 'Centavos')
  }

  if (intPart === 0 && centsPart > 0) {
    // only cents, no "Reais"
  }

  return parts.join(' ')
}
