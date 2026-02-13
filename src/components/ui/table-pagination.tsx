'use client'

import { Button } from '@/components/ui/button'
import { MdChevronLeft, MdChevronRight } from 'react-icons/md'

export type TablePaginationProps = {
  /** Índice do primeiro item da página (1-based, ex: 1) */
  from: number
  /** Índice do último item da página (ex: 20) */
  to: number
  /** Total de itens */
  total: number
  /** Página atual (1-based) */
  page: number
  /** Total de páginas */
  totalPages: number
  onPrevious: () => void
  onNext: () => void
  /** Tamanho da página atual (opcional). Se informado, exibe o seletor "Itens por página". */
  pageSize?: number
  /** Opções do seletor (ex: [10, 20, 50, 100]). Usado junto com pageSize e onPageSizeChange. */
  pageSizeOptions?: readonly number[]
  onPageSizeChange?: (size: number) => void
  /** Id do select para acessibilidade. Se não informado, usa um id interno. */
  selectId?: string
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

/**
 * Barra de paginação reutilizável para tabelas.
 * Exibe "Mostrando X–Y de Z", opcionalmente o seletor de itens por página, e botões Anterior/Próxima.
 */
export function TablePagination({
  from,
  to,
  total,
  page,
  totalPages,
  onPrevious,
  onNext,
  pageSize,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onPageSizeChange,
  selectId = 'table-pagination-page-size',
}: TablePaginationProps) {
  const showPageSizeSelector = pageSize != null && onPageSizeChange != null
  const visible = total > 0 && (totalPages > 1 || showPageSizeSelector)

  if (!visible) return null

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[8px] border border-[#E0E3E7] bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-6">
        <span className="text-sm text-[#57636C]">
          Mostrando <span className="font-medium text-[#14181B]">{from}–{to}</span> de <span className="font-medium text-[#14181B]">{total}</span>
        </span>
        {showPageSizeSelector && (
          <div className="flex items-center gap-2">
            <label htmlFor={selectId} className="text-sm font-medium text-[#57636C]">
              Itens por página
            </label>
            <select
              id={selectId}
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-9 min-w-[4.5rem] cursor-pointer rounded-[8px] border border-[#E0E3E7] bg-[#f1f4f8] px-3 py-1.5 text-sm text-[#14181B] focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="secondary"
          disabled={page <= 1}
          onClick={onPrevious}
          className="gap-1.5"
        >
          <MdChevronLeft className="h-5 w-5" aria-hidden />
          Anterior
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={page >= totalPages}
          onClick={onNext}
          className="gap-1.5"
        >
          Próxima
          <MdChevronRight className="h-5 w-5" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
