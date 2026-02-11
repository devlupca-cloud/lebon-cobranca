# Lebon Cobranças – Instruções do projeto

Aplicação web para gestão de cobranças: **Next.js 16**, **React**, **Supabase**, **Tailwind CSS**.

## Contexto

Migração do front de **FlutterFlow para Next.js (React)**. Backend em construção no Supabase (tabelas, RLS, `company_id` via `company_users`).

**Referências obrigatórias:** @README e @docs/DESIGN.md.

## Comandos úteis

- `npm run dev` – desenvolvimento
- `npm run build` – build de produção
- `npm run lint` – ESLint
- `npx supabase` – CLI do Supabase (v2.76.7) para acessar banco, migrations, etc.

## Estrutura do projeto

```
src/
├── app/
│   ├── (auth)/          # login, cadastre-se
│   └── (dashboard)/     # páginas internas (layout: Sidebar + Header)
├── components/
│   ├── ui/              # Button, Input, Modal, LoadingScreen
│   └── *.tsx            # componentes de domínio (forms, popups)
├── contexts/            # HeaderProvider (header dinâmico)
├── hooks/               # useCompanyId
├── lib/
│   ├── design.ts        # tokens do design system
│   ├── format.ts        # CPF, CNPJ, datas, moeda
│   ├── auth.ts          # signOut
│   ├── viacep.ts        # busca de endereço por CEP
│   └── supabase/        # client, server, customers, contracts, etc.
└── types/
    └── database.ts      # tipos das tabelas
```

## Quatro papéis (agentes)

As regras em `.claude/rules/` definem o comportamento por contexto. São ativadas automaticamente pelos paths dos arquivos:

| Papel | Quando ativa | Arquivo |
|-------|-------------|---------|
| **Front** | Telas, componentes, rotas, hooks | `.claude/rules/front.md` |
| **Back** | Funções Supabase, tipos | `.claude/rules/back.md` |
| **QA** | Testes, revisão de qualidade | `.claude/rules/qa.md` |
| **UX/UI** | Design system, acessibilidade | `.claude/rules/ux-ui.md` |

Você também pode invocar explicitamente: "como agente front, migra essa tela" ou "como back, cria a função de listagem".

## Workflow de migração (FlutterFlow → React)

Ao migrar uma tela do FlutterFlow:

1. **Entender a tela original** – campos, ações, navegação, dados consumidos
2. **Criar a rota** – em `src/app/(dashboard)/nome-da-tela/page.tsx` (slug em português, kebab-case)
3. **Seguir o esqueleto de página** – descrito em `front.md` (useCompanyId → loading → error → conteúdo)
4. **Criar funções de dados** – em `src/lib/supabase/` se não existirem, seguindo padrão de `back.md`
5. **Usar design system** – importar tokens de `@/lib/design`, nunca inventar estilos novos
6. **Extrair componentes** – se um trecho de UI for reutilizável, criar em `src/components/`
7. **Validar** – usar checklist do `qa.md` para revisar antes de finalizar

## Páginas já migradas

- Login e cadastro (auth)
- Home (dashboard)
- Clientes: listagem, cadastro, edição, detalhes
- Contratos: listagem, novo contrato
- Inadimplentes
- Simulação
- Fluxo de caixa
- Extrato financeiro
- Gerar documentos
- Financiamento, cheque financiamento
- Empréstimos
- Cadastro geral, base de cálculo
- Cadastrar fluxo de caixa, cadastrar acesso
- Perfil

## Regras gerais

- **Idioma do código:** inglês para nomes de variáveis/funções, português para textos exibidos ao usuário
- **Multi-tenant:** Todo acesso a dados filtra por `company_id`
- **Soft delete:** Usar `deleted_at` em vez de DELETE
- **Sem `any`:** Tipos explícitos sempre
- **Design tokens:** Nunca hardcodar Tailwind para algo que tem constante em `design.ts`
