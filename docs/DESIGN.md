# Design system – Lebon Cobranças

Padronização visual e de componentes do projeto.

## Cores

| Uso            | Hex        | Tailwind / uso                          |
|----------------|------------|-----------------------------------------|
| Primária       | `#1E3A8A`  | Botões, links, sidebar, header, foco    |
| Hover primária | `#1e40af`  | Hover em botão primário                 |
| Fundo app      | `#f1f4f8`  | Área de conteúdo (dashboard)            |
| Fundo card     | `#ffffff`  | Cards, tabelas, modais                 |
| Texto primário | `#14181B`  | Títulos, conteúdo principal             |
| Texto secundário | `#57636C` | Labels, descrições, dados secundários  |
| Borda          | `#E0E3E7`  | Inputs, cards, divisórias                |
| Erro           | `#ff5963`  | Mensagens de erro                       |
| Sucesso        | `#249689`  | Confirmações, indicadores positivos     |

## Tipografia

- **Corpo:** Inter
- **Títulos:** Inter Tight (opcional para destaque)
- **Tamanhos:** `text-sm` (formulários/tabelas), `text-base` (corpo), `text-[22px]` ou `text-2xl` (título de página)

## Componentes

### Inputs e selects

- Altura única: `py-2.5 px-3 text-sm`
- `rounded-lg`, borda `#E0E3E7`, fundo `#f1f4f8`
- Foco: `border-[#1E3A8A] ring-1 ring-[#1E3A8A]`
- Usar a constante `input` de `@/lib/design`

### Botões

- Mesma altura dos inputs: `py-2.5 px-4 text-sm`, `rounded-lg`
- Primário: `bg-[#1E3A8A] text-white`
- Secundário: `bg-[#f1f4f8] border border-[#E0E3E7] text-[#1E3A8A]`
- Usar componente `Button` ou constantes `buttonPrimary` / `buttonSecondary` de `@/lib/design`

### Tabelas

- Cabeçalho: `bg-[#f1f4f8]`, texto `text-[#57636C] uppercase text-xs font-medium`
- Células: `text-sm`, primário `#14181B` ou secundário `#57636C`
- Bordas: `divide-[#E0E3E7]`

### Cards

- `rounded-lg border border-[#E0E3E7] bg-white shadow-sm`

### Badge PF/PJ

- `rounded-full bg-[#14181B] px-2.5 py-0.5 text-xs font-medium text-white`

## Onde está definido

- **CSS variables:** `src/app/globals.css` (`:root`)
- **Classes reutilizáveis:** `src/lib/design.ts` – importar e usar nas páginas/componentes
- **Regra para o editor:** `.cursor/rules/design-system.mdc` – seguir ao criar ou alterar UI

## Uso

```tsx
import { input, label, buttonPrimary, card, tableHead, tableCellMuted } from '@/lib/design'

// Formulário
<label className={label}>Nome</label>
<input className={input} />

// Botão
<button type="button" className={buttonPrimary}>Salvar</button>

// Tabela
<th className={tableHead}>Coluna</th>
<td className={tableCellMuted}>Valor</td>
```

Novas telas e componentes devem seguir estes padrões para manter o visual consistente.
