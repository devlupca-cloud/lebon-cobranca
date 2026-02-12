# Lebon Cobranças (Web)

Aplicação web para gestão de cobranças – Next.js, React, Supabase, Tailwind CSS.

---

## Pré-requisitos

- **Node.js** 18+ (recomendado 20+)
- **npm** (ou yarn/pnpm/bun)

---

## Setup local

1. **Clone e instale dependências**

   ```bash
   git clone https://github.com/devlupca-cloud/lebon-cobranca.git
   cd lebon-cobranca
   npm install
   ```

2. **Variáveis de ambiente**

   Crie um arquivo `.env.local` na raiz do projeto (não commitar):

   ```bash
   cp .env.example .env.local
   ```

   Edite `.env.local` e preencha:

   - `NEXT_PUBLIC_SUPABASE_URL` – URL do projeto no [Supabase](https://supabase.com) (Settings → API)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` – chave anon do mesmo projeto

   Sem essas variáveis, login e dados do Supabase não funcionam.

3. **Backend (Supabase) – Cadastro de cliente**

   Para o botão **Salvar cliente** funcionar, o projeto Supabase precisa ter:

   - **Tabela `customers`** com (no mínimo): `company_id` (uuid), `person_type` (text: `'fisica'` ou `'juridica'`), `status_id` (int), `cpf`, `cnpj`, `legal_name`, `trade_name`, `full_name`, `state_registration`, `phone`, `mobile`, `email`, `birth_date`, `occupation`, `referral`, `customer_code`, `credit_limit`, `outstanding_balance`, `marital_status_id`, `address_id` (uuid, opcional). Colunas de auditoria: `id` (uuid, default gen_random_uuid()), `created_at`, `updated_at`, `deleted_at` (nullável).
   - **Tabela `addresses`** (opcional): se existir, o endereço do cliente é gravado nela e o `address_id` é vinculado ao cliente. Colunas: `id`, `street`, `number`, `neighbourhood`, `city`, `state`, `zip_code`, `additional_info`.
   - **RLS (Row Level Security):** o usuário autenticado precisa ter permissão de **INSERT** na tabela `customers` (e em `addresses`, se usar).
   - **company_id:** o usuário logado precisa estar vinculado a uma empresa em `company_users`; o `company_id` usado no cadastro vem daí.

   Se a API falhar, a mensagem de erro do Supabase aparece na tela (ex.: coluna inexistente, RLS bloqueando). Ajuste o schema ou as políticas no Supabase conforme o erro.

4. **Rodar em desenvolvimento**

   ```bash
   npm run dev
   ```

   Acesse [http://localhost:3000](http://localhost:3000).

5. **Dados de exemplo (seed)**

   Para ver todas as telas com dados (Dashboard, Clientes, Contratos, Inadimplentes, Fluxo de caixa, etc.):

   - **Pré-requisito:** faça login na aplicação e vincule sua conta a uma empresa em **Cadastrar Acesso** (assim existirá uma linha em `company_users` com `company_id`).
   - **Local (Supabase CLI):** `npx supabase db reset` aplica as migrations e em seguida executa `supabase/seed.sql`.
   - **Supabase hospedado:** no Dashboard do projeto, abra **SQL Editor**, cole o conteúdo de `supabase/seed.sql` e execute. O script usa o primeiro `company_id` de `company_users`; os dados ficarão visíveis para usuários vinculados a essa empresa.

   O seed insere: 8 endereços (se a tabela existir), 8 clientes (PF/PJ, códigos, telefones, etc.), 5 contratos (um com fiador), parcelas, pagamentos e 7 despesas.

   **Apagar os dados atuais e preencher de novo (mantendo seu usuário):**

   1. No **SQL Editor** do Supabase, execute primeiro o script **`supabase/clean-data.sql`**. Ele remove apenas os dados da empresa vinculada ao usuário **devlup@devlup.ca** (pagamentos, parcelas, contratos, despesas, clientes, endereços). Não mexe em `auth.users` nem em `company_users`, então seu login continua válido.
   2. Em seguida execute o **`supabase/seed.sql`**. Ele preenche de novo a mesma empresa (a primeira ativa em `company_users`).

   Se você usa outro e-mail, edite em `clean-data.sql` a linha `WHERE u.email = 'devlup@devlup.ca'` e coloque seu e-mail.

---

## Scripts

| Comando        | Uso                          |
|----------------|------------------------------|
| `npm run dev`  | Servidor de desenvolvimento  |
| `npm run build`| Build de produção            |
| `npm run start`| Servidor de produção (após build) |
| `npm run lint` | ESLint                       |

---

## Design system (obrigatório)

O projeto tem **padronização de design** para manter o layout consistente entre todas as pessoas que editam.

- **Documentação:** [docs/DESIGN.md](docs/DESIGN.md) – cores, tipografia, componentes, exemplos.
- **Classes reutilizáveis:** `src/lib/design.ts` – importar `input`, `label`, `buttonPrimary`, `buttonSecondary`, `card`, `tableHead`, `tableCell`, `tableCellMuted`, `pillType`, `pageTitle`, `pageSubtitle` e usar nas `className` em vez de montar Tailwind à mão.
- **Tokens CSS:** `src/app/globals.css` – variáveis `:root` (cores, espaçamento, radius).

**Regras:** usar sempre as cores e estilos do design system; preferir constantes de `@/lib/design` em novas telas e componentes.

---

## Cursor / Antigravity – alinhamento da equipe

Quem for editar o projeto (na sua máquina ou em outra) deve ficar **alinhado** com os padrões do repositório. Se você usa **Cursor** ou **Antigravity**, as regras do projeto ajudam a manter esse alinhamento.

- **Onde estão as regras:** `.cursor/rules/`
  - `design-system.mdc` – cores, tipografia, formulários, uso de `@/lib/design`.
  - `use-libraries.mdc` – priorizar bibliotecas prontas (ex.: `react-icons`, formatação, validação) em vez de implementar tudo na mão.

- **O que fazer:**
  1. Abrir o projeto pela **pasta raiz** (onde está o `package.json` e a pasta `.cursor`), para o editor carregar as regras.
  2. Respeitar o design system e as regras ao criar ou alterar UI e código.
  3. Ao adicionar telas ou componentes, usar `@/lib/design` e consultar [docs/DESIGN.md](docs/DESIGN.md).

Assim, quem fizer edição na máquina dela fica precisamente alinhado com o resto do time.

---

## Estrutura relevante

```
src/
  app/           # Rotas Next.js (auth, dashboard)
  components/    # Componentes reutilizáveis (sidebar, header, popups, ui)
  contexts/     # React context (ex.: header)
  lib/          # Utilitários: design.ts, auth, supabase, format
  types/        # Tipos (ex.: database.ts)
  middleware.ts # Auth / redirecionamento
docs/
  DESIGN.md     # Documentação do design system
.cursor/rules/  # Regras para Cursor/Antigravity
.env.example    # Modelo de variáveis de ambiente
```

---

## Deploy

Build de produção: `npm run build` e depois `npm run start`. Para deploy na [Vercel](https://vercel.com), conectar o repositório e configurar as mesmas variáveis de ambiente (`NEXT_PUBLIC_SUPABASE_*`).

---

## Referências

- [Next.js](https://nextjs.org/docs)
- [Supabase](https://supabase.com/docs)
- Design system do projeto: [docs/DESIGN.md](docs/DESIGN.md)
