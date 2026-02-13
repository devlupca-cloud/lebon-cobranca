/** Remove tudo que não for dígito */
function digitsOnly(value: string | null | undefined): string {
  if (value == null || typeof value !== 'string') return ''
  return value.replace(/\D/g, '')
}

/** Formata CPF: 000.000.000-00 */
export function formatCPF(value: string | null | undefined): string {
  const d = digitsOnly(value)
  if (d.length !== 11) return value && value.trim() ? value : '—'
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/** Máscara de CPF ao digitar (máx. 11 dígitos) → 000.000.000-00 */
export function maskCPF(value: string | null | undefined): string {
  const d = digitsOnly(value ?? '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/** Formata CNPJ: 00.000.000/0000-00 */
export function formatCNPJ(value: string | null | undefined): string {
  const d = digitsOnly(value)
  if (d.length !== 14) return value && value.trim() ? value : '—'
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

/** Máscara de CNPJ ao digitar (máx. 14 dígitos) → 00.000.000/0000-00 */
export function maskCNPJ(value: string | null | undefined): string {
  const d = digitsOnly(value ?? '').slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

/** Formata telefone: (11) 3456-7890 (fixo) ou (11) 98888-7777 (celular) */
export function formatPhone(value: string | null | undefined): string {
  const d = digitsOnly(value)
  if (d.length === 0) return value && value.trim() ? value : '—'
  if (d.length === 11) {
    return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  if (d.length === 10) {
    return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  return value && value.trim() ? value : '—'
}

/** Máscara de telefone ao digitar: fixo (10) → (11) 3456-7890, celular (11) → (11) 98888-7777 */
export function maskPhone(value: string | null | undefined): string {
  const d = digitsOnly(value ?? '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Exibe CPF ou CNPJ formatado conforme o tamanho (11 = CPF, 14 = CNPJ) */
export function formatCPFOrCNPJ(cpf: string | null | undefined, cnpj: string | null | undefined): string {
  const cnpjDigits = digitsOnly(cnpj)
  const cpfDigits = digitsOnly(cpf)
  if (cnpjDigits.length === 14) return formatCNPJ(cnpj)
  if (cpfDigits.length === 11) return formatCPF(cpf)
  if (cnpj && cnpj.trim()) return cnpj
  if (cpf && cpf.trim()) return cpf
  return '—'
}

/** Formata string de data para dd-mm-yyyy (máx. 8 dígitos → dd-mm-yyyy) */
export function formatDateDDMMYYYY(value: string | null | undefined): string {
  const d = digitsOnly(value ?? '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}-${d.slice(2)}`
  return `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}`
}

/** Converte data ISO (yyyy-mm-dd) para dd-mm-yyyy para exibição no form. */
export function formatISOToDDMMYYYY(iso: string | null | undefined): string {
  if (!iso || typeof iso !== 'string') return ''
  const parts = iso.trim().split('-')
  if (parts.length !== 3) return ''
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}

/** Converte dd-mm-yyyy para yyyy-mm-dd (ISO) para API. Retorna null se inválido. */
export function parseDDMMYYYYToISO(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null
  const d = digitsOnly(value)
  if (d.length !== 8) return null
  const day = d.slice(0, 2)
  const month = d.slice(2, 4)
  const year = d.slice(4, 8)
  const dayN = parseInt(day, 10)
  const monthN = parseInt(month, 10)
  if (dayN < 1 || dayN > 31 || monthN < 1 || monthN > 12) return null
  return `${year}-${month}-${day}`
}

/** Máscara de valor em R$ ao digitar (apenas dígitos → centavos). Ex.: 100050 → "1.000,50" */
export function maskCurrency(value: string | null | undefined): string {
  const d = digitsOnly(value ?? '').slice(0, 15)
  if (d.length === 0) return ''
  let intPart = d.length <= 2 ? '0' : d.slice(0, -2).replace(/^0+/, '') || '0'
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const decPart = d.length <= 2 ? d.padStart(2, '0') : d.slice(-2)
  return `${intPart},${decPart}`
}

/** Converte valor formatado (1.000,50) ou dígitos para número. Retorna null se vazio/inválido. */
export function parseCurrency(value: string | null | undefined): number | null {
  if (!value || typeof value !== 'string') return null
  const normalized = value.trim().replace(/\./g, '').replace(',', '.')
  if (normalized === '') return null
  const n = parseFloat(normalized)
  return Number.isFinite(n) ? n : null
}

/** Converte valor formatado em apenas dígitos (centavos). Ex.: "12.300,50" → "1230050" */
export function currencyToDigits(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') return ''
  return digitsOnly(value).slice(0, 15)
}
