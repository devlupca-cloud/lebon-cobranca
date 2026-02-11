---
paths:
  - "src/**/*.tsx"
  - "src/app/globals.css"
  - "src/lib/design.ts"
---

# Agente UX/UI – Design system e acessibilidade

## Referência obrigatória

- **Classes reutilizáveis:** `src/lib/design.ts` – SEMPRE importar e usar nas `className`.
- **Documentação visual:** `docs/DESIGN.md`

## Tokens do design system (`@/lib/design`)

| Constante | Uso |
|-----------|-----|
| `input` | Inputs e selects (h-42px, rounded-8px, borda, foco azul) |
| `label` | Labels de formulário |
| `buttonPrimary` | Botão principal (bg azul #1E3A8A, texto branco) |
| `buttonSecondary` | Botão secundário (bg branco, texto azul, borda) |
| `card` | Container de card (bg branco, borda, sombra leve) |
| `tableHead` | Header de tabela (bg #f8fafc, texto uppercase) |
| `tableCell` | Célula de tabela (texto primário #0f1419) |
| `tableCellMuted` | Célula de tabela (texto secundário #536471) |
| `pillType` | Badge PF/PJ (bg #0f1419, texto branco) |
| `pageTitle` | Título de página (text-xl/22px, font-semibold) |
| `pageSubtitle` | Subtítulo de página (text-sm, #536471) |

## Cores (valores reais do design.ts)

| Uso | Hex | Onde |
|-----|-----|------|
| Primary | `#1E3A8A` | Botões, foco, links, sidebar |
| Primary hover | `#1d4ed8` | Hover em buttonPrimary |
| Texto primário | `#0f1419` | Títulos, conteúdo principal |
| Texto secundário | `#536471` | Labels, descrições, muted |
| Placeholder | `#94a3b8` | Inputs placeholder |
| Borda | `#e5e7eb` | Inputs, cards, separadores |
| Fundo app | `#f1f4f8` | Background geral do dashboard |
| Fundo card | `#ffffff` | Cards, tabelas, modais |
| Fundo table head | `#f8fafc` | Cabeçalho de tabelas |
| Erro | `#ff5963` / red-700 | Mensagens de erro |
| Sucesso | `#249689` | Confirmações |

## Tipografia

- **Corpo:** Inter (font-sans do layout)
- **Títulos:** Inter Tight (font-display do layout, opcional)
- **Tamanhos:** `text-sm` (formulários, tabelas), `text-xl`/`text-[22px]` (títulos de página), `text-xs` (badges, table headers)

## Padrões de layout

- **Página dashboard:** `<div className="flex-1 overflow-auto p-6">` como wrapper
- **Seção de form:** `<section className={card + ' p-6'}>` com `<h2>` interno
- **Grid de campos:** `<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">`
- **Filtros inline:** `<div className="mb-6 flex flex-wrap items-end gap-4">`
- **Tabela:** `<div className="overflow-hidden rounded-[8px] border border-[#e5e7eb] bg-white">` wrapper

## Acessibilidade

- Labels associados a inputs (`htmlFor` + `id`)
- Mensagens de erro com `role="alert"` quando apropriado
- Estados de foco visíveis (ring/border primária via design tokens)
- Contraste mínimo garantido pelo design system

## Regra

Novas telas e componentes **devem** usar as constantes de `@/lib/design`. Nunca hardcodar Tailwind para elementos que já têm token definido. Se precisar de um token novo, adicionar em `design.ts` primeiro.
