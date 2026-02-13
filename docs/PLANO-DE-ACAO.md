# Plano de Acao - Lebon Cobrancas

> Gerado a partir de auditoria completa do projeto em 13/02/2026.
> Organizado por fases, com prioridade e agent responsavel.

---

## Resumo Executivo

O projeto esta **bem estruturado** no geral: multi-tenant enforced, soft delete consistente, tipos TypeScript solidos, RPCs para operacoes criticas. Os problemas sao de **polimento**, nao de fundacao.

**Nota geral do projeto: B+ (85/100)** — fundacao solida, precisa polimento.

**Problemas encontrados:**
- 5 rotas com nomes incorretos (typos, falta de kebab-case)
- 3 paginas STUB sem backend (emprestimos, cadastro-geral, xeque-financiamento)
- 4 paginas sem design tokens (home, perfil, login, cadastre-se)
- 7 funcoes usando `select('*')` em vez de colunas explicitas
- 6 endpoints de listagem sem paginacao
- Pagina "Esqueci senha" linkada no login mas nao existe
- 2 forms que coletam dados mas nao salvam todos os campos (financiamento, base-de-calculo)
- 2 componentes muito grandes (contratos 611 linhas, gerar documentos 458 linhas)
- Geracao de documentos incompleta (2 de 4 tipos implementados)
- Botoes "Relatorios" desabilitados em inadimplentes e fluxo-caixa
- Nenhum sistema de notificacoes (toast)
- Nenhum teste automatizado

---

## Fase 1: Higiene & Correcoes Criticas

> Corrigir problemas que afetam consistencia, SEO, e convencoes do projeto.
> **Prioridade: ALTA** | **Estimativa: 1-2 dias**

### 1.1 Corrigir nomes de rotas

As rotas devem ser em portugues, kebab-case. Problemas encontrados:

| Rota atual | Problema | Rota correta |
|------------|----------|--------------|
| `/extrato-fianceiro` | Typo ("fianceiro" → "financeiro") | `/extrato-financeiro` |
| `/profile06` | Ingles + numero arbitrario | `/perfil` |
| `/inadimplentes01` | Sufixo "01" desnecessario | `/inadimplentes` |
| `/gerardocumentosnovo` | Falta kebab-case | `/gerar-documentos` |
| `/xeque-financiamento` | "xeque" → "cheque" | `/cheque-financiamento` |

**Agent:** senior-frontend-architect
**Impacto:** Renomear pastas em `src/app/(dashboard)/`, atualizar sidebar, atualizar Links em todas as paginas que referenciam essas rotas.
**Risco:** Quebrar navegacao se algum link ficar apontando para rota antiga.

---

### 1.2 Pagina Home - Aplicar design tokens

A pagina `src/app/(dashboard)/home/page.tsx` nao importa de `@/lib/design`. Provavelmente usa classes Tailwind hardcoded que deveriam ser tokens.

**Agent:** senior-frontend-architect
**Tarefa:** Revisar e substituir classes hardcoded por tokens do design system.

---

### 1.3 Pagina Perfil - Redesign com design tokens

A pagina `src/app/(dashboard)/profile06/page.tsx` usa classes `zinc-*` do Tailwind em vez do design system. Tambem precisa:
- Renomear para `/perfil`
- Usar `card`, `pageTitle`, `pageSubtitle` de `@/lib/design`
- Usar `LoadingScreen` em vez de loading inline
- Adicionar funcionalidade de trocar senha (mencionada no fluxo de cadastrar acesso)

**Agent:** senior-frontend-architect

---

### 1.4 Decidir destino das paginas STUB (sem backend)

3 paginas tem UI pronta mas **nao salvam nada**:

| Pagina | Status atual | Decisao necessaria |
|--------|-------------|-------------------|
| `/emprestimos` | Form completo, mostra "salvamento a ser definido" | Conectar ao backend (insertContract com categoria LOAN) ou remover? |
| `/cadastro-geral` | Form completo, mostra "nao persiste no backend ainda" | Definir qual tabela salva ou remover? |
| `/xeque-financiamento` | Dados em localStorage, perde ao recarregar | Criar tabela no Supabase ou remover? |

**Agent:** product-owner (decidir) → supabase-backend-engineer (implementar se necessario)
**Impacto:** Usuarios podem pensar que dados estao sendo salvos quando nao estao.

---

### 1.5 Criar pagina "Esqueci senha"

O login tem link para `/esqueci-senha` que **nao existe**. Opcoes:
- Criar pagina simples com `supabase.auth.resetPasswordForEmail()`
- Ou remover o link temporariamente

**Agent:** senior-frontend-architect

---

### 1.6 Corrigir perda de dados em Financiamento/Base de Calculo

As paginas `/financiamento` e `/base-de-calculo` coletam campos extras (telefone, celular, comercial, taxa, CPF) que **nao sao salvos** na tabela `contracts`.

**Agent:** product-owner (quais campos sao necessarios?) → supabase-backend-engineer (adicionar colunas ou usar tabela separada)

---

### 1.7 Aplicar design tokens nas paginas de auth

Login (`/login`) e Cadastro (`/cadastre-se`) usam cores hardcoded (`zinc-*`, `#f0f2f6`) em vez do design system.

**Agent:** senior-frontend-architect

---

### 1.8 Substituir `select('*')` por colunas explicitas

Funcoes que usam `select('*')`:

| Arquivo | Funcao |
|---------|--------|
| `users.ts` | `getCompanyUsers()` |
| `customers.ts` | `getCustomerById()` |
| `payments.ts` | `recordPayment()`, `getPaymentsByInstallment()`, `getPaymentsByContract()` |
| `expenses.ts` | `getExpenses()`, `getExpenseById()`, `createExpense()`, etc. |
| `files.ts` | `getCustomerFiles()`, `getContractFiles()` |

**Agent:** supabase-backend-engineer
**Impacto:** Performance (menos dados trafegados), seguranca (menos dados expostos).

---

## Fase 2: Funcionalidades Faltantes

> Completar gaps que afetam a experiencia do usuario.
> **Prioridade: ALTA** | **Estimativa: 3-5 dias**

### 2.1 Sistema de Toast/Notificacoes

O projeto nao tem componente de notificacao. Atualmente, sucesso e erro sao mostrados inline com divs. Precisamos de:
- Componente `Toast` em `src/components/ui/`
- Context `ToastProvider` em `src/contexts/`
- Hook `useToast()` para usar em qualquer lugar
- Variantes: success, error, warning, info

**Agent:** senior-frontend-architect
**Impacto:** UX consistente em todo o app para feedback de acoes.

---

### 2.2 Adicionar paginacao server-side onde falta

Endpoints que retornam TODOS os registros sem paginacao:

| Funcao | Arquivo | Risco |
|--------|---------|-------|
| `getCompanyUsers()` | `users.ts` | Baixo (poucos usuarios por empresa) |
| `getExpenses()` | `expenses.ts` | **Alto** (pode ter centenas) |
| `getOverdueInstallments()` | `installments.ts` | **Alto** (pode ter milhares) |
| `getPaymentsByContract()` | `payments.ts` | Medio |
| `getCustomerFiles()` | `files.ts` | Baixo |
| `getContractFiles()` | `files.ts` | Baixo |

**Priorizar:** `getExpenses()` e `getOverdueInstallments()` — maior volume.

**Agent:** supabase-backend-engineer (funcoes) + senior-frontend-architect (UI de paginacao)

---

### 2.3 Hook `useDebounce`

Varias paginas implementam debounce manualmente com `useRef<ReturnType<typeof setTimeout>>`. Extrair para um hook reutilizavel:

```ts
// src/hooks/use-debounce.ts
export function useDebounce<T>(value: T, delay: number): T
```

**Agent:** senior-frontend-architect
**Paginas afetadas:** clientes (busca), contratos (busca), inadimplentes (busca).

---

### 2.4 Componentes UI faltantes

Componentes que seriam uteis baseado nos padroes atuais:

| Componente | Justificativa | Prioridade |
|------------|---------------|-----------|
| `Select` | Varios forms usam `<select>` nativo sem padronizacao | Alta |
| `Textarea` | Necessario para campos de observacao (contratos, pagamentos) | Media |
| `Badge/Pill` | Usado para status de contrato, parcela, etc. | Media |
| `Skeleton` | Loading states mais elegantes (home KPIs ja usa animate-pulse) | Baixa |
| `EmptyState` | Componente padronizado para "nenhum registro encontrado" | Baixa |

**Agent:** senior-frontend-architect

---

### 2.5 Refatorar componentes grandes

| Arquivo | Linhas | Problema |
|---------|--------|----------|
| `contratos/page.tsx` | 611 | Mistura filtros, tabela desktop, cards mobile, popups |
| `gerardocumentosnovo/page.tsx` | 458 | Mistura selecao de contrato, preview, geracao PDF |

**Agent:** senior-frontend-architect
**Acao:** Extrair sub-componentes (ContractFilters, ContractTable, ContractCards, etc.)

---

### 2.6 Completar geracao de documentos

Atualmente so funciona:
- [x] Confissao de Divida
- [x] Carta de Quitacao
- [ ] Carta de Anuencia
- [ ] Ficha Cadastral

**Agent:** product-owner (definir conteudo dos documentos) → senior-frontend-architect (implementar templates PDF)

---

### 2.7 Implementar botoes "Relatorios"

Botoes desabilitados em:
- `/inadimplentes01` — botao "Relatorios" com `disabled`
- `/fluxo-caixa` — botao "Relatorios" com `onClick` vazio

**Agent:** product-owner (definir quais relatorios) → senior-frontend-architect (implementar)

---

## Fase 3: Polimento de UX

> Melhorar a experiencia do usuario nas telas existentes.
> **Prioridade: MEDIA** | **Estimativa: 3-5 dias**

### 3.1 Auditoria de responsividade

Todas as paginas de listagem devem ter:
- Tabela para desktop (`hidden md:block`)
- Cards para mobile (`md:hidden`)
- Paginacao funcional em ambos

**Paginas para verificar:** Verificar todas as 15+ paginas de dashboard e garantir consistencia.

**Agent:** senior-frontend-architect + code-reviewer

---

### 3.2 Padronizar estados de loading/error/empty

Garantir que TODAS as paginas seguem o padrao:

```tsx
if (companyLoading) return <LoadingScreen message="Carregando..." />
if (companyError || !companyId) return <ErrorState />
if (loading) return <LoadingScreen message="Carregando dados..." />
if (error) return <ErrorBanner message={error} />
if (data.length === 0) return <EmptyState message="Nenhum registro." />
```

**Agent:** code-reviewer (auditar) + senior-frontend-architect (corrigir)

---

### 3.3 Acessibilidade

Verificar em todas as telas:
- [ ] Labels com `htmlFor` associado ao `id` do input
- [ ] Botoes de acao com `aria-label` descritivo
- [ ] Mensagens de erro com `role="alert"`
- [ ] Estados de foco visiveis
- [ ] Contraste adequado (design system ja garante na maioria)

**Agent:** code-reviewer

---

### 3.4 Revisao da Home/Dashboard

A pagina Home mostra KPIs e resumos. Verificar:
- [ ] Dados corretos (total clientes, contratos ativos, valores)
- [ ] Loading skeletons nos cards de KPI
- [ ] Graficos ou resumos de fluxo de caixa
- [ ] Links rapidos para acoes mais usadas

**Agent:** product-owner (validar dados) + senior-frontend-architect (implementar)

---

## Fase 4: Otimizacao & Performance

> Preparar o app para escala.
> **Prioridade: MEDIA** | **Estimativa: 2-3 dias**

### 4.1 Otimizar queries de relatorios

O `reports.ts` ja usa RPCs, mas verificar:
- `getDashboardStats` — tem fallback legado que faz multiplas queries
- `getCashFlowForecast` — pode ser lento com muitos contratos
- `getOverdueSummary` — carrega TODOS os overdue para agrupar client-side

**Agent:** supabase-backend-engineer
**Acao:** Criar RPCs no banco para operacoes de agregacao pesadas.

---

### 4.2 Adicionar indices ao banco

Verificar indices para:
- `contracts.company_id` + `contracts.deleted_at` (composite)
- `contract_installments.contract_id` + `contract_installments.status_id`
- `contract_installments.due_date` (para queries de overdue)
- `customers.company_id` + `customers.deleted_at`

**Agent:** supabase-backend-engineer
**Acao:** `npx supabase inspect db seq-scans` para identificar scans sequenciais.

---

### 4.3 Implementar cache client-side

Avaliar se vale implementar React Query ou SWR para:
- Dashboard stats (cache de 30s)
- Listas de clientes e contratos (cache com invalidacao)
- Lookups (status, categorias) — cache longo

**Agent:** senior-frontend-architect
**Decisao necessaria:** Escolher React Query vs SWR vs manter manual.

---

## Fase 5: Qualidade & Testes

> Garantir que o codigo e confiavel.
> **Prioridade: MEDIA-BAIXA** | **Estimativa: 3-5 dias**

### 5.1 Setup de testes

Configurar Vitest + React Testing Library:
- Instalar dependencias
- Configurar `vitest.config.ts`
- Criar primeiro teste como referencia

**Agent:** code-reviewer (definir estrategia) + senior-frontend-architect (implementar)

---

### 5.2 Testes prioritarios

Ordem de prioridade:

1. **`src/lib/format.ts`** — funcoes puras, faceis de testar (CPF, CNPJ, moeda, datas)
2. **`src/lib/simulacao.ts`** — calculo financeiro (PMT), critico para o negocio
3. **`src/lib/supabase/contracts.ts`** → `generateInstallments()` — logica de geracao de parcelas
4. **`src/types/enums.ts`** — validar que IDs estao corretos vs banco

**Agent:** code-reviewer

---

### 5.3 Lint & formatacao

- Verificar se ESLint esta configurado e rodando
- Garantir `npm run lint` passa sem erros
- Considerar adicionar Prettier se nao tiver

**Agent:** code-reviewer

---

## Fase 6: Features Futuras (Backlog)

> Ideias para proximas sprints, nao urgentes.
> **Prioridade: BAIXA**

### 6.1 Renegociacao de divida
- Fluxo para renegociar parcelas vencidas
- Gerar novas parcelas com novos termos
- **Agent:** product-owner (definir regras) → supabase-backend-engineer → senior-frontend-architect

### 6.2 Relatorios avancados
- Exportacao para PDF/Excel
- Graficos de tendencia (inadimplencia ao longo do tempo)
- **Agent:** product-owner (definir metricas) → supabase-backend-engineer (queries) → senior-frontend-architect (UI)

### 6.3 Notificacoes push / email
- Lembrete de parcela proxima do vencimento
- Alerta de inadimplencia
- **Agent:** supabase-backend-engineer (Edge Functions)

### 6.4 Dark mode
- Usar CSS variables em vez de hardcoded colors
- Exige refactor do design system
- **Agent:** senior-frontend-architect

### 6.5 PWA / Mobile
- Service worker para offline
- Push notifications
- App-like experience
- **Agent:** senior-frontend-architect

---

## Ordem de Execucao Recomendada

```
Semana 1 — Higiene:
  [1.1] Corrigir nomes de rotas (5 rotas)
  [1.2] Home - aplicar design tokens
  [1.3] Perfil - redesign + renomear rota
  [1.4] Decidir destino das paginas STUB (decisao do PO)
  [1.5] Criar pagina "Esqueci senha"
  [1.6] Corrigir perda de dados em financiamento/base-de-calculo
  [1.7] Design tokens nas paginas de auth
  [1.8] Substituir select('*')

Semana 2 — Funcionalidades core:
  [2.1] Sistema de Toast
  [2.2] Paginacao server-side (expenses + inadimplentes)
  [2.3] Hook useDebounce
  [2.4] Componentes UI (Select, Badge)
  [2.5] Refatorar contratos (611 linhas) e gerar documentos (458 linhas)

Semana 3 — Polimento:
  [2.6] Completar geracao de documentos (anuencia + ficha)
  [2.7] Implementar botoes "Relatorios"
  [3.1] Auditoria de responsividade
  [3.2] Padronizar loading/error/empty
  [3.3] Acessibilidade

Semana 4 — Performance + Testes:
  [3.4] Revisao da Home/Dashboard
  [4.1] Otimizar queries de relatorios
  [4.2] Adicionar indices
  [5.1] Setup de testes (Vitest)
  [5.2] Testes prioritarios (format, simulacao, installments)

Continuo:
  [4.3] Cache client-side
  [5.3] Lint & formatacao
  [6.x] Features do backlog
```

---

## Como usar este plano

1. Escolha uma tarefa pelo numero (ex: "1.1")
2. Diga para o Claude: **"Execute a tarefa 1.1 do plano"**
3. O Claude vai acionar o agent correto automaticamente
4. Apos concluir, o code-reviewer revisa antes de commitar
5. Marque a tarefa como concluida aqui

### Legenda de status
- [ ] Pendente
- [x] Concluido
- [-] Em andamento
- [~] Cancelado/Adiado
