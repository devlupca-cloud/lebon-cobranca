# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projeto

Aplicacao web para gestao de cobrancas: **Next.js 16** (App Router), **React 19**, **Supabase**, **Tailwind CSS 4**.

Migracao do front de **FlutterFlow para Next.js (React)**. Backend em construcao no Supabase (tabelas, RLS, `company_id` via `company_users`).

**Referencias obrigatorias:** `README.md` e `docs/DESIGN.md`.

## Comandos

- `npm run dev` -- desenvolvimento (http://localhost:3000)
- `npm run build` -- build de producao
- `npm run lint` -- ESLint
- `npm run start` -- servidor de producao (apos build)
- `npx supabase` -- CLI do Supabase (v2.76.7) para schema, migrations, RLS

## Variaveis de ambiente

Arquivo `.env.local` (nao commitar) com:
- `NEXT_PUBLIC_SUPABASE_URL` -- URL do projeto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` -- chave anon do Supabase

## Arquitetura

### Autenticacao e middleware

`src/proxy.ts` (ex-`middleware.ts`, renomeado no Next 16) intercepta todas as rotas:
- Usuarios nao autenticados sao redirecionados para `/login`
- Usuarios autenticados em rotas de auth (`/login`, `/cadastre-se`, `/esqueci-senha`) vao para `/home`
- Rota `/` redireciona conforme estado de autenticacao
- `?code=` na URL: middleware troca o code por sessao (`exchangeCodeForSession`) e redireciona para `/redefinir-senha` (password recovery) ou `/login` com erro
- `/redefinir-senha` so acessivel se autenticado (vindo do fluxo de recovery)
- Supabase auth via `@supabase/ssr` com cookies

### Multi-tenancy

Todo acesso a dados filtra por `company_id`. A tabela `company_users` mapeia usuarios a empresas.
- **Client components:** `useCompanyId()` hook (de `src/hooks/use-company-id.ts`) -- dentro do dashboard usa o `DashboardAuthContext` (sem chamada extra); fora do dashboard faz fallback para `getCompanyId()`
- **Server/effects:** `getCompanyId()` (de `src/lib/supabase/company`)
- Nunca hardcodar `company_id`

### Estrutura de rotas

- `src/app/(auth)/` -- login, cadastre-se, esqueci-senha, redefinir-senha (layout sem sidebar)
- `src/app/(dashboard)/` -- paginas internas (layout com Sidebar + Header)
- `src/app/auth/callback/` -- callback do OAuth/magic link
- **Novas rotas:** sempre kebab-case em portugues (ex: `fluxo-de-caixa`, `gerar-documentos`). Algumas rotas ja migradas tem sufixos numericos ou nomes colados (`profile06`, `inadimplentes01`, `gerardocumentosnovo`) -- sao resquicios do FlutterFlow; nao replicar esse padrao em codigo novo.

### Camada de dados

Funcoes em `src/lib/supabase/` (um arquivo por dominio: `customers.ts`, `contracts.ts`, `installments.ts`, `payments.ts`, `expenses.ts`, `reports.ts`, `activity.ts`, `admin.ts`, `users.ts`, `files.ts`, `storage.ts`, `company.ts`):
- Client browser: `createClient()` de `@/lib/supabase/client`
- Client server: `createServerClient()` de `@/lib/supabase/server`
- Sempre filtrar por `company_id`
- Erros: `throw new Error(error.message)` -- front trata com try/catch
- Soft delete: setar `deleted_at`, nunca deletar de verdade
- RPCs: `supabase.rpc('nome', { params })` -- ex: `get_my_profile` em `company.ts`
- **Paginacao:** funcoes de listagem aceitam `limit`/`offset`; no front usar `TablePagination` de `@/components/ui`
- PDF: `jspdf` disponivel para geracao de documentos

### Outras libs utilitarias (`src/lib/`)

- `auth.ts` -- helpers de autenticacao Supabase
- `format.ts` -- CPF, CNPJ, moeda, datas, telefone (sempre reutilizar, nunca reimplementar)
- `viacep.ts` -- integracao ViaCEP para preenchimento automatico de endereco
- `simulacao.ts` -- logica da tela de simulacao de emprestimo
- `pdf/` -- templates `jspdf` para geracao de documentos

### Design system

Tokens centralizados em `src/lib/design.ts`: `input`, `label`, `buttonPrimary`, `buttonSecondary`, `card`, `tableHead`, `tableCell`, `tableCellMuted`, `pillType`, `pageTitle`, `pageSubtitle`.

- **Sempre** importar de `@/lib/design` em vez de hardcodar Tailwind
- CSS variables em `src/app/globals.css`
- Documentacao completa em `docs/DESIGN.md`
- Icones: `react-icons/md` (Material Design)
- Formatacao (CPF, CNPJ, moeda, datas): `@/lib/format`

### Contextos do dashboard

O layout do dashboard (`src/app/(dashboard)/layout.tsx`) envolve o conteudo com dois providers aninhados:

1. **`DashboardAuthProvider`** (`src/contexts/dashboard-auth-context.tsx`) -- carrega `user` (auth) + `profile` (RPC `get_my_profile`) **uma unica vez** no mount. `useCompanyId()` consome desse contexto dentro do dashboard, evitando chamadas duplicadas. Expoe `refetch()` para recarregar apos atualizar perfil.
2. **`HeaderProvider`** (`src/contexts/header-context.tsx`) -- permite que cada pagina injete conteudo no header via `useHeader().setLeftContent()`. Limpar no cleanup do useEffect.

### Botao Voltar automatico

`src/components/dashboard-header.tsx` renderiza um botao `←` no header sempre que o usuario esta em uma sub-rota. Destino em ordem de prioridade:
1. Penultimo item do `breadcrumb` que tenha `href` (setado por cada pagina via `setBreadcrumb`)
2. Mapa estatico `BACK_FALLBACK` no proprio `dashboard-header.tsx` (ex: `/detalhes-contrato` -> `/contratos`, `/cadastrar-cliente` -> `/clientes`)

Nao aparece em rotas de listagem (2 niveis de breadcrumb). Para uma nova sub-rota, preferir configurar breadcrumb correto na pagina; o fallback e plano B.

### Dados da empresa (hardcoded nos PDFs)

Endereco oficial do CNPJ 30.082.816/0001-72 esta **duplicado** em 6 geradores (`src/lib/pdf/contract-pdf.ts`, `quitacao-pdf.ts`, `anuencia-pdf.ts`, `ficha-cadastral-pdf.ts`, `acordo-pdf.ts`, `recibo-pdf.ts`) na const `COMPANY`. Atual: **R. Adelino Cardana, 293 - Bloco C Sala 702, Centro, 06401-147, Barueri - SP, Tel 11 9.7020-0447**.

Se mudar endereco, editar os 6 arquivos. O `contract-pdf.ts` tambem tem 3 mencoes a **Barueri** em texto corrido (Clausula 6, fechamento, data de assinatura) que precisam trocar juntas.

Imagens do PDF (`public/pdf/watermark-lebon.jpg` marca d'agua + `public/pdf/logo-mo.jpg` logo M/O rodape) sao carregadas via `fetch` dentro de `generateContractPdf` -- a funcao e **async**.

## Quatro papeis (agentes)

Regras detalhadas em `.claude/rules/` sao ativadas automaticamente pelos paths dos arquivos:

| Papel | Quando ativa | Arquivo |
|-------|-------------|---------|
| **Front** | Telas, componentes, rotas, hooks | `.claude/rules/front.md` |
| **Back** | Funcoes Supabase, tipos | `.claude/rules/back.md` |
| **QA** | Testes, revisao de qualidade | `.claude/rules/qa.md` |
| **UX/UI** | Design system, acessibilidade | `.claude/rules/ux-ui.md` |

Invocacao explicita: "como agente front, migra essa tela" ou "como back, cria a funcao de listagem".

As regras em `.cursor/rules/` (`design-system.mdc`, `use-libraries.mdc`) sao o espelho para o editor Cursor/Antigravity -- mesmos principios, formato `.mdc`. Nao editar um sem sincronizar o outro se a regra for a mesma.

## Workflow de migracao (FlutterFlow -> React)

1. **Entender a tela original** -- campos, acoes, navegacao, dados consumidos
2. **Criar a rota** -- em `src/app/(dashboard)/nome-da-tela/page.tsx`
3. **Seguir o esqueleto de pagina** -- descrito em `.claude/rules/front.md` (useCompanyId -> loading -> error -> conteudo)
4. **Criar funcoes de dados** -- em `src/lib/supabase/` seguindo padrao de `.claude/rules/back.md`
5. **Usar design system** -- importar tokens de `@/lib/design`
6. **Extrair componentes** -- reutilizaveis em `src/components/`
7. **Validar** -- checklist do `.claude/rules/qa.md`

## Paginas ja migradas

Login, cadastro, home, clientes (listagem/cadastro/edicao/detalhes), contratos (listagem/novo/detalhes/edicao), inadimplentes, simulacao, fluxo de caixa, extrato financeiro, gerar documentos, financiamento, cheque financiamento (rota: `xeque-financiamento` -- nome com X e resquicio do FlutterFlow), emprestimos, cadastro geral, base de calculo, cadastrar fluxo de caixa, cadastrar acesso, perfil, configuracoes.

## Fluxos de negocio principais

### Criacao de contrato e saldo devedor

Form `src/components/contrato-form.tsx` salva contratos como **Ativo por padrao** (antes era Rascunho). Ao inserir contrato ativo, `insertContract`/`activateContract` em `src/lib/supabase/contracts.ts`:

1. `generateInstallments(contract)` insere N parcelas com `origin_id = CONTRACT (1)`, `status_id = OPEN (1)`
2. `updateCustomerBalance(customerId, companyId)` em `src/lib/supabase/customers.ts` recalcula `customers.outstanding_balance` somando `(amount - amount_paid)` das parcelas com `status_id IN (1,2,4)` do cliente

Quando pagar parcela (RPC `record_payment`), saldo e recalculado automaticamente. O modal `src/components/popup-detalhes-cliente.tsx` exibe **saldo devedor em vermelho com prefixo `−`** e **limite disponivel = `credit_limit - outstanding_balance`**. Ele hidrata via `getCustomerById` ao abrir, contornando dados desatualizados que viriam da RPC `get_customers`.

### Simulacao -> Novo Contrato

`/simulacao` ao clicar "Novo Contrato" propaga pela URL:
- `valor` = **total** (parcelas x qtd com juros embutidos)
- `taxa` = 0 (juros ja embutidos no total)
- `installmentAmount`, `principal`, `taxaSimulada` (metadata para trilha de auditoria)

`/novo-contrato` consome e, se `principal`/`taxaSimulada` vierem, injeta automaticamente nas **Observacoes internas** do contrato (nao aparece no PDF).

### Acordo de renegociacao (Inadimplentes)

Na tela `/inadimplentes01`, botao "Acordo" abre `src/components/popup-acordo.tsx` (modal). Usuario seleciona parcelas via checkbox, clica "Continuar para simulacao" e vai para `/simulacao?agreement=1&contractId=X&installmentIds=a,b,c&valor=Y`.

Em modo `agreement`, a tela de simulacao mostra botao "Efetivar Acordo" que chama a RPC **`create_renegotiation_agreement`** (ver `src/lib/supabase/installments.ts:createAgreement`). A RPC:
1. Marca parcelas selecionadas como `status_id = RENEGOTIATED (6)`
2. Insere novas parcelas no MESMO contrato com `origin_id = RENEGOTIATION (2)`, continuando a numeracao
3. Reabre contrato se estava fechado
4. Recalcula `outstanding_balance` do cliente

Nao existe tabela `agreements` separada -- historico fica nas proprias parcelas. Status/origin em `src/types/enums.ts`.

### Baixa de parcela (pagamento)

Componente central: `src/components/popup-quitacao.tsx`. Usa RPC `record_payment` que:
- Insere linha em `installment_payments`
- Atualiza `status_id` da parcela (OPEN -> PARTIAL/PAID)
- Fecha o contrato se todas as parcelas ativas estiverem pagas
- Recalcula `outstanding_balance` do cliente

Pontos de entrada (atalhos) do modal:
- `/detalhes-contrato/[id]` -- coluna "Acao" da tabela de parcelas (botao por parcela com saldo > 0)
- `/extrato-financeiro` -- botao "Pagar parcela" em cada linha da tabela de contratos ativos + botao "Registrar pagamento" nas movimentacoes tipo `installment`
- `/extrato-financeiro/movimentacoes` -- botao "Registrar pagamento" em cada movimentacao tipo `installment`
- `/contratos` (listagem) -- botao "Quitar"

### Inadimplencia

E automatica: `getOverdueInstallments` em `src/lib/supabase/installments.ts` busca parcelas com `due_date < hoje AND amount_paid < amount AND deleted_at IS NULL`. Agrupadas por contrato em `inadimplentes01/page.tsx`. Bucket `90+` dias marca "Ag. Citacao"; menores marcam "Acordo". Nao existe cadastro manual de inadimplente -- se precisa cadastrar uma divida avulsa, botao "Nova divida avulsa" leva para `/novo-contrato`.

## Migrations de referencia (criadas em 2026-04-22)

- `20260422000000_rpc_create_renegotiation_agreement.sql` -- RPC do acordo
- `20260422000001_customers_rg_birthplace_system_code.sql` -- 3 colunas novas em `customers` (rg, birthplace, system_code) + RPC `recalculate_customer_balance(customer_id, company_id)`
- `20260422000002_recalculate_all_customer_balances.sql` -- UPDATE em massa idempotente para reconciliar `outstanding_balance` legado. Seguro rodar de novo.

**Atencao:** a RPC `get_customers` (definida no Dashboard Supabase, nao versionada neste repo) **nao retorna** as colunas novas `rg`, `birthplace`, `system_code`. O modal de detalhes contorna via `getCustomerById` (select direto). Se precisar expor na listagem, editar a RPC no Dashboard.

## Dados de exemplo (seed)

- **Pre-requisito:** usuario logado vinculado a empresa em `company_users`
- **Local:** `npx supabase db reset` (aplica migrations + `supabase/seed.sql`)
- **Hospedado:** executar `supabase/seed.sql` no SQL Editor do Supabase
- **Limpar e repopular:** executar `supabase/clean-data.sql` e depois `supabase/seed.sql`

## Regras gerais

- **Idioma do codigo:** ingles para variaveis/funcoes, portugues para textos exibidos ao usuario
- **Multi-tenant:** Todo acesso a dados filtra por `company_id`
- **Soft delete:** `deleted_at` em vez de DELETE
- **Sem `any`:** Tipos explicitos sempre (tipos em `src/types/database.ts`)
- **Design tokens:** Nunca hardcodar Tailwind para algo que tem constante em `design.ts`
- **Bibliotecas:** Priorizar libs prontas (`react-icons`, `jspdf`, formatacao, validacao) em vez de reimplementar
- **Componentes compartilhados:** Formularios reutilizaveis em `src/components/` (`cliente-form.tsx`, `contrato-form.tsx`), popups (`popup-*.tsx`), UI primitivos em `src/components/ui/` com barrel export: `import { Button, ConfirmModal, CurrencyInput, Input, Loading, LoadingScreen, Modal, TablePagination } from '@/components/ui'`
- **Testes:** o projeto **ainda nao tem** testes automatizados. Stack definida para quando forem adicionados: **Vitest + React Testing Library** (ver `.claude/rules/qa.md`). Nao introduzir outra stack de teste sem alinhar com o usuario.
