/**
 * Design system – classes padronizadas para o projeto Lebon Cobranças.
 * Use estas constantes em vez de repetir Tailwind nos componentes.
 *
 * Cores: primary #1E3A8A | background #f1f4f8 | text #14181B / #57636C | border #E0E3E7
 * Espaçamento: inputs/botões com py-2.5 px-3 (ou px-4 para botões) | radius rounded-lg
 */

/** Input e select – mesma altura e estilo */
export const input =
  'w-full rounded-lg border border-[#E0E3E7] bg-[#f1f4f8] px-3 py-2.5 text-sm text-[#14181B] placeholder:text-[#57636C] focus:border-[#1E3A8A] focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]'

/** Label de formulário */
export const label = 'mb-2 block text-sm font-medium text-[#14181B]'

/** Botão primário (azul Lebon) – altura alinhada aos inputs */
export const buttonPrimary =
  'inline-flex items-center justify-center rounded-lg border border-transparent bg-[#1E3A8A] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1e40af] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:ring-offset-2 disabled:opacity-50'

/** Botão secundário (fundo cinza, texto azul) – altura alinhada aos inputs */
export const buttonSecondary =
  'inline-flex items-center justify-center rounded-lg border border-[#E0E3E7] bg-[#f1f4f8] px-4 py-2.5 text-sm font-medium text-[#1E3A8A] transition-colors hover:bg-[#e8ecf1] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:ring-offset-2 disabled:opacity-50'

/** Card (fundo branco, borda suave) */
export const card = 'rounded-lg border border-[#E0E3E7] bg-white shadow-sm'

/** Cabeçalho de tabela */
export const tableHead = 'bg-[#f1f4f8] px-4 py-3 text-left text-xs font-medium uppercase text-[#57636C]'

/** Célula de tabela – texto primário */
export const tableCell = 'px-4 py-3 text-sm text-[#14181B]'

/** Célula de tabela – texto secundário */
export const tableCellMuted = 'px-4 py-3 text-sm text-[#57636C]'

/** Pill tipo PF/PJ */
export const pillType = 'inline-flex rounded-full bg-[#14181B] px-2.5 py-0.5 text-xs font-medium text-white'

/** Título de página */
export const pageTitle = 'text-[22px] font-semibold tracking-tight text-[#14181B]'

/** Subtítulo / descrição de página */
export const pageSubtitle = 'mt-1 text-sm text-[#57636C]'
