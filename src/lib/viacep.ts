/**
 * Integração com a API ViaCEP (https://viacep.com.br).
 * Busca endereço a partir do CEP (apenas dígitos, 8 caracteres).
 */

export type ViaCepResponse = {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  ibge?: string
  gia?: string
  ddd?: string
  siafi?: string
  erro?: boolean
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export async function fetchAddressByCep(cep: string): Promise<ViaCepResponse | null> {
  const digits = onlyDigits(cep)
  if (digits.length !== 8) return null

  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
  if (!res.ok) return null

  const data = (await res.json()) as ViaCepResponse
  if (data.erro === true) return null

  return data
}
