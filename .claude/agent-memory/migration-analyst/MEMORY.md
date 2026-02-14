# Migration Analyst Memory

## Widget-to-Component Mappings Confirmed

Ver detalhes em `widget-mappings.md`

## Screen Patterns

### Balance/KPI Cards
- Página Home usa cards brancos com borda `border-slate-200/80`
- FlutterFlow tem cards com gradiente (verde→roxo) que ainda não foram implementados
- Padrão atual: fundo branco, shadow-sm, rounded-[8px]
- Novo padrão necessário: gradientes customizados para destaque visual

### Data Functions Location
- Reports/Analytics: `src/lib/supabase/reports.ts`
- Customers: `src/lib/supabase/customers.ts`
- Contracts: `src/lib/supabase/contracts.ts`

### Typo Known
- Rota atual: `/extrato-fianceiro` (typo: "fianceiro")
- Deveria ser: `/extrato-financeiro`
- Presente em links da home page também (linha 224)

## Design System

### Color Palette (verificado em design.ts)
- Primary: `#1E3A8A` (azul Lebon)
- Background: `#f0f2f6` ou `#f1f4f8`
- Text primary: `#0f1419`
- Text secondary: `#536471`
- Border: `#e5e7eb`

### Border Radius Standard
- Padrão: `rounded-[8px]` (todos os cards, inputs, botões)

### Button Variants
- Primary: `buttonPrimary` token (azul `#1E3A8A`)
- Secondary: `buttonSecondary` token (branco com borda)
- Cores customizadas para contextos específicos (teal para contratos, red para inadimplentes)

## Screens Analyzed

- Home (dashboard): KPI cards, quick actions
- Extrato Financeiro: Pendente adaptação FlutterFlow → React
