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

/** Formata CNPJ: 00.000.000/0000-00 */
export function formatCNPJ(value: string | null | undefined): string {
  const d = digitsOnly(value)
  if (d.length !== 14) return value && value.trim() ? value : '—'
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
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
