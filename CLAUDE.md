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

`src/middleware.ts` intercepta todas as rotas:
- Usuarios nao autenticados sao redirecionados para `/login`
- Usuarios autenticados em rotas de auth (`/login`, `/cadastre-se`) vao para `/home`
- Rota `/` redireciona conforme estado de autenticacao
- Supabase auth via `@supabase/ssr` com cookies

### Multi-tenancy

Todo acesso a dados filtra por `company_id`. A tabela `company_users` mapeia usuarios a empresas.
- **Client components:** `useCompanyId()` hook (de `src/hooks/use-company-id.ts`)
- **Server/effects:** `getCompanyId()` (de `src/lib/supabase/`)
- Nunca hardcodar `company_id`

### Estrutura de rotas

- `src/app/(auth)/` -- login, cadastro (layout sem sidebar)
- `src/app/(dashboard)/` -- paginas internas (layout com Sidebar + Header)
- Rotas em portugues, kebab-case (ex: `fluxo-de-caixa`, `gerar-documentos`)

### Camada de dados

Funcoes em `src/lib/supabase/` (um arquivo por dominio: `customers.ts`, `contracts.ts`, etc.):
- Client browser: `createClient()` de `@/lib/supabase/client`
- Client server: `createServerClient()` de `@/lib/supabase/server`
- Sempre filtrar por `company_id`
- Erros: `throw new Error(error.message)` -- front trata com try/catch
- Soft delete: setar `deleted_at`, nunca deletar de verdade
- RPCs: `supabase.rpc('nome', { params })`

### Design system

Tokens centralizados em `src/lib/design.ts`: `input`, `label`, `buttonPrimary`, `buttonSecondary`, `card`, `tableHead`, `tableCell`, `tableCellMuted`, `pillType`, `pageTitle`, `pageSubtitle`.

- **Sempre** importar de `@/lib/design` em vez de hardcodar Tailwind
- CSS variables em `src/app/globals.css`
- Documentacao completa em `docs/DESIGN.md`
- Icones: `react-icons/md` (Material Design)
- Formatacao (CPF, CNPJ, moeda, datas): `@/lib/format`

### Header dinamico

`HeaderProvider` em `src/contexts/header-context.tsx` permite que cada pagina injete conteudo no header via `useHeader().setLeftContent()`. Limpar no cleanup do useEffect.

## Quatro papeis (agentes)

Regras detalhadas em `.claude/rules/` sao ativadas automaticamente pelos paths dos arquivos:

| Papel | Quando ativa | Arquivo |
|-------|-------------|---------|
| **Front** | Telas, componentes, rotas, hooks | `.claude/rules/front.md` |
| **Back** | Funcoes Supabase, tipos | `.claude/rules/back.md` |
| **QA** | Testes, revisao de qualidade | `.claude/rules/qa.md` |
| **UX/UI** | Design system, acessibilidade | `.claude/rules/ux-ui.md` |

Invocacao explicita: "como agente front, migra essa tela" ou "como back, cria a funcao de listagem".

## Workflow de migracao (FlutterFlow -> React)

1. **Entender a tela original** -- campos, acoes, navegacao, dados consumidos
2. **Criar a rota** -- em `src/app/(dashboard)/nome-da-tela/page.tsx`
3. **Seguir o esqueleto de pagina** -- descrito em `.claude/rules/front.md` (useCompanyId -> loading -> error -> conteudo)
4. **Criar funcoes de dados** -- em `src/lib/supabase/` seguindo padrao de `.claude/rules/back.md`
5. **Usar design system** -- importar tokens de `@/lib/design`
6. **Extrair componentes** -- reutilizaveis em `src/components/`
7. **Validar** -- checklist do `.claude/rules/qa.md`

## Paginas ja migradas

Login, cadastro, home, clientes (listagem/cadastro/edicao/detalhes), contratos (listagem/novo), inadimplentes, simulacao, fluxo de caixa, extrato financeiro, gerar documentos, financiamento, cheque financiamento, emprestimos, cadastro geral, base de calculo, cadastrar fluxo de caixa, cadastrar acesso, perfil.

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
- **Bibliotecas:** Priorizar libs prontas (`react-icons`, formatacao, validacao) em vez de reimplementar
