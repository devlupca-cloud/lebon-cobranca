/**
 * Design system – classes padronizadas para o projeto Lebon Cobranças.
 * Use estas constantes em vez de repetir Tailwind nos componentes.
 *
 * Cores: primary #1E3A8A | background #f0f2f6 | text #0f1419 / #536471 | border #e5e7eb
 */

/** Input e select – mesma altura (42px), fundo branco, borda suave, foco azul. radius = 8px */
export const input =
  'h-[42px] w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-[#0f1419] placeholder:text-[#94a3b8] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20'

/** Label de formulário */
export const label =
  'mb-1.5 block text-sm font-medium text-[#0f1419]'

/** Botão primário (azul Lebon). radius = 8px */
export const buttonPrimary =
  'inline-flex items-center justify-center gap-2 rounded-[8px] border-0 bg-[#1E3A8A] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#1d4ed8] hover:shadow focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'

/** Botão secundário (fundo claro, texto azul). radius = 8px */
export const buttonSecondary =
  'inline-flex items-center justify-center gap-2 rounded-[8px] border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-medium text-[#1E3A8A] transition hover:bg-[#f8fafc] hover:border-[#cbd5e1] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20 focus:ring-offset-2 disabled:opacity-50'

/** Card – fundo branco, borda suave, sombra leve. radius = 8px */
export const card =
  'rounded-[8px] border border-[#e5e7eb] bg-white shadow-sm'

/** Cabeçalho de tabela */
export const tableHead =
  'bg-[#f8fafc] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#536471]'

/** Célula de tabela – texto primário */
export const tableCell =
  'px-4 py-3 text-sm text-[#0f1419]'

/** Célula de tabela – texto secundário */
export const tableCellMuted =
  'px-4 py-3 text-sm text-[#536471]'

/** Pill tipo PF/PJ. radius = 8px */
export const pillType =
  'inline-flex rounded-[8px] bg-[#0f1419] px-2.5 py-0.5 text-xs font-medium text-white'

/** Título de página */
export const pageTitle =
  'text-xl font-semibold tracking-tight text-[#0f1419] sm:text-[22px]'

/** Subtítulo / descrição de página */
export const pageSubtitle =
  'mt-0.5 text-sm text-[#536471]'
