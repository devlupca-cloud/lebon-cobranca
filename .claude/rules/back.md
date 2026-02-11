---
paths:
  - "src/lib/supabase/**/*"
  - "src/types/**/*"
---

# Agente Back – Dados, Supabase, tipos

## Escopo

- **Código no repo:** `src/lib/supabase/` e `src/types/database.ts`
- **Backend real:** Schema, RLS e políticas ficam no **Supabase** (dashboard ou CLI)
- **CLI disponível:** `npx supabase` (v2.76.7) – usar para inspecionar schema, rodar migrations, verificar RLS, etc.

## Padrão de funções Supabase

Todas as funções em `src/lib/supabase/` seguem esta estrutura:

```ts
import { createClient } from '@/lib/supabase/client'

export async function getAlgo(params: { companyId: string; ... }) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tabela')
    .select('...')
    .eq('company_id', params.companyId)
    // ... filtros

  if (error) throw new Error(error.message)
  return data
}
```

**Convenções:**
- Sempre criar o client com `createClient()` de `@/lib/supabase/client` (browser) ou `createServerClient()` de `@/lib/supabase/server` (server components/actions)
- Sempre filtrar por `company_id` – nunca retornar dados sem filtro de empresa
- Lançar `throw new Error(error.message)` em caso de erro do Supabase – o front trata com try/catch
- Funções de listagem aceitam `limit` e `offset` para paginação
- Soft delete: setar `deleted_at` com timestamp, nunca deletar de verdade
- RPCs: usar `supabase.rpc('nome_da_funcao', { params })` quando existir function no banco

## Tipos (`src/types/database.ts`)

- Manter tipos sincronizados com o schema do Supabase
- Tipos existentes: `Customer`, `GetCustomersResponse`, `CustomerFromAPI`, `Contract`, `ContractInstallment`, `CustomerAutocompleteItem`
- Ao adicionar tabela ou coluna nova: primeiro criar no Supabase (SQL/dashboard), depois atualizar `database.ts`
- Usar tipos explícitos (não `any`) nos retornos das funções

## Tabelas de referência

### customers
company_id, person_type ('fisica'|'juridica'), status_id, cpf, cnpj, legal_name, trade_name, full_name, state_registration, phone, mobile, email, birth_date, occupation, referral, customer_code, credit_limit, outstanding_balance, marital_status_id, address_id; auditoria: id, created_at, updated_at, deleted_at

### addresses
id, street, number, neighbourhood, city, state, zip_code, additional_info

### company_users
Mapeia usuários a empresas. Campos: company_id, is_active, name, email, photo_user. Usado para obter o `company_id` do usuário logado via `getCompanyId()`.

## Regras

1. Respeitar o schema descrito acima e os tipos em `database.ts`
2. Mudanças de schema/RLS → criar no Supabase (dashboard ou `npx supabase migration new`), depois atualizar tipos
3. Para inspecionar tabelas/colunas: `npx supabase db dump` ou `npx supabase inspect db table-sizes`
4. Nunca expor chaves ou secrets no código client-side
5. Funções novas devem seguir o padrão das existentes (`customers.ts`, `contracts.ts`)
