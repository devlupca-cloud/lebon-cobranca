'use client'

import * as React from 'react'

/**
 * Input de moeda BR com máscara crescente "dígito a dígito".
 *
 * Valor é armazenado internamente como string com formato "X,YZ" (centavos
 * ao final). Ao digitar, o componente só aceita números e vai deslocando
 * a vírgula a partir dos centavos: "1" → "0,01" · "123" → "1,23" · "12345" → "123,45".
 *
 * Exporta valor como string com ponto decimal (padrão JS: "123.45") via onChange,
 * e aceita valor inicial em string com vírgula ou ponto.
 */

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode'> {
  /** Valor em string: "123,45" ou "123.45" ou "". */
  value: string
  /** Callback com o valor formatado com vírgula (ex.: "123,45") — compatível com forms atuais. */
  onChange: (valueComma: string) => void
  /** Se true, mostra prefixo "R$" dentro do input (padrão true). */
  showPrefix?: boolean
  /** Classe extra pro wrapper. */
  wrapperClassName?: string
}

function onlyDigits(s: string): string {
  return s.replace(/\D+/g, '')
}

function formatFromDigits(digits: string): string {
  const clean = digits.replace(/^0+/, '') || '0'
  const padded = clean.padStart(3, '0') // garante pelo menos "000" → 0,00
  const cents = padded.slice(-2)
  const whole = padded.slice(0, -2)
  // Separadores de milhar
  const wholeWithDots = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${wholeWithDots},${cents}`
}

function externalValueToDigits(value: string): string {
  if (!value) return ''
  const trimmed = value.trim()
  let normalized: string

  if (trimmed.includes(',')) {
    // Formato pt-BR explicito (virgula como decimal): "1.234,56" -> 1234.56
    normalized = trimmed.replace(/\./g, '').replace(',', '.')
  } else {
    // Sem virgula: ambiguo entre "1.234" (milhar pt-BR = 1234) vs "1234.56" (decimal JS).
    // Heuristica: 1 ponto com 1 ou 2 digitos depois -> decimal JS. Caso contrario -> milhar.
    const dotCount = (trimmed.match(/\./g) || []).length
    if (dotCount === 1) {
      const afterDot = trimmed.split('.')[1] ?? ''
      if (afterDot.length === 1 || afterDot.length === 2) {
        normalized = trimmed // ja eh decimal JS, parseFloat aceita direto
      } else {
        normalized = trimmed.replace(/\./g, '') // separador de milhar
      }
    } else {
      normalized = trimmed.replace(/\./g, '')
    }
  }

  const num = parseFloat(normalized)
  if (isNaN(num) || num === 0) return ''
  const cents = Math.round(num * 100)
  return String(cents)
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, showPrefix = true, wrapperClassName = '', className = '', disabled, ...props }, ref) => {
    // Mantém os dígitos brutos internamente, derivando a exibição a partir deles.
    const [digits, setDigits] = React.useState<string>(() => externalValueToDigits(value))

    // Se o valor externo mudar (ex.: limpar form), resincroniza.
    React.useEffect(() => {
      const externalDigits = externalValueToDigits(value)
      setDigits((prev) => (prev === externalDigits ? prev : externalDigits))
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value])

    const display = digits === '' ? '' : formatFromDigits(digits)

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const nextDigits = onlyDigits(e.target.value)
      setDigits(nextDigits)
      // Emite no formato com vírgula para o form-state atual.
      if (nextDigits === '') {
        onChange('')
        return
      }
      const formatted = formatFromDigits(nextDigits)
      // Remove separador de milhar no valor emitido (forms esperam "123,45")
      onChange(formatted.replace(/\./g, ''))
    }

    return (
      <div className={`flex rounded-[8px] border border-[#E0E3E7] bg-white focus-within:border-[#1E3A8A] focus-within:ring-2 focus-within:ring-[#1E3A8A]/20 ${disabled ? 'opacity-50' : ''} ${wrapperClassName}`}>
        {showPrefix && (
          <span className="flex h-[42px] items-center pl-3 text-sm text-[#57636C]">R$</span>
        )}
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          value={display}
          onChange={handleChange}
          disabled={disabled}
          className={`h-[42px] flex-1 rounded-r-[8px] border-0 bg-transparent px-3 py-2.5 text-sm text-[#0f1419] placeholder:text-[#94a3b8] focus:outline-none ${className}`}
          placeholder="0,00"
          {...props}
        />
      </div>
    )
  }
)
CurrencyInput.displayName = 'CurrencyInput'
