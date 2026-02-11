# Status do backend — Lebon Cobranças

Documento de referência do que já foi implementado e do que falta (incluindo passos no Supabase).

---

## O que já está pronto (4 fases executadas)

### Fase 1 — Fundação
- **Tipos** em `src/types/database.ts`: `InstallmentPayment`, lookups (ContractStatus, PaymentMethod, etc.), `CustomerFile`, `ContractFile`, `Company`, `CompanyUser`, `ContractWithRelations`, `GetContractsResponse`.
- **Enums** em `src/types/enums.ts`: `CONTRACT_STATUS`, `INSTALLMENT_STATUS`, `PAYMENT_METHOD`, `INSTALLMENT_ORIGIN`, etc.
- **Tabela** `installment_payments`: você confirmou que já existe no banco.

### Fase 2 — Contratos
- **contracts.ts**: `getContractById`, `getContractsFiltered` (filtros + paginação), `updateContract`, `deleteContract` (soft), `generateInstallments`, `activateContract`, `checkAndCloseContract`. `insertContract` gera parcelas automaticamente quando `status_id = ACTIVE`.
- **installments.ts**: `updateInstallment`, `cancelInstallment`.

### Fase 3 — Pagamentos
- **payments.ts**: `recordPayment`, `getPaymentsByInstallment`, `getPaymentsByContract`, `deletePayment` (reverte e recalcula parcela). Atualização automática de `contract_installments` (amount_paid, status) e chamada a `checkAndCloseContract` e `updateCustomerBalance`.
- **customers.ts**: `updateCustomerBalance` (recalcula saldo devedor).

### Fase 4 — Relatórios, usuários e arquivos
- **reports.ts**: `getCashFlowForecast`, `getFinancialSummary`, `getOverdueSummary`.
- **users.ts**: `getCompanyUsers`, `createCompanyUser`, `updateCompanyUser`, `deactivateCompanyUser`.
- **files.ts**: `uploadCustomerFile`, `getCustomerFiles`, `uploadContractFile`, `getContractFiles`, `deleteFile` (soft delete + storage).

---

## O que você precisa fazer no Supabase (Dashboard)

### 0. Coluna Fiador na tabela `contracts`

Para o cadastro de **fiador** no novo contrato, a tabela `contracts` precisa da coluna `guarantor_customer_id`. No **SQL Editor** do Supabase, rode:

```sql
-- Adiciona coluna fiador (referência ao cliente cadastrado como fiador)
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS guarantor_customer_id uuid REFERENCES public.customers(id);

COMMENT ON COLUMN public.contracts.guarantor_customer_id IS 'Cliente cadastrado como fiador do contrato (opcional)';
```

Se a tabela `customers` estiver em outro schema, ajuste `public.customers(id)` conforme seu banco.

### 1. Conferir RLS na tabela `installment_payments`

No **SQL Editor** do Supabase, rode:

```sql
-- Ver se RLS está habilitado e quais policies existem
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'installment_payments';

SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'installment_payments';
```

- Se `rowsecurity = true` e já existir uma policy que use `company_id` e `company_users` (por exemplo `company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid() AND is_active = true)`), **não precisa fazer nada**.
- Se RLS não estiver habilitado ou não houver policy, rode o bloco abaixo.

### 2. Habilitar RLS e criar policy (se ainda não existir)

```sql
ALTER TABLE public.installment_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_access" ON public.installment_payments
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
```

Se der erro de policy já existente, ignore; significa que já está configurado.

---

## Próximos passos (quando quiser continuar)

1. **Conectar o front às novas funções**
   - Páginas de contratos: usar `getContractsFiltered`, `getContractById`, `updateContract`, `deleteContract`, `activateContract`.
   - Parcelas: usar `updateInstallment`, `cancelInstallment` onde fizer sentido.
   - Pagamentos: usar `recordPayment`, `getPaymentsByInstallment`, `getPaymentsByContract`, `deletePayment` (ex.: no popup de quitação).
   - Fluxo de caixa / extrato: usar `getCashFlowForecast`, `getFinancialSummary`.
   - Inadimplentes: usar `getOverdueSummary` e as funções de installments já existentes.
   - Cadastrar acesso: usar `getCompanyUsers`, `createCompanyUser`, `updateCompanyUser`, `deactivateCompanyUser`.
   - Documentos do cliente/contrato: usar as funções de `files.ts` e garantir que o bucket `documents` exista no Storage com RLS adequada.

2. **Bucket de arquivos**
   - No Supabase: Storage → criar bucket `documents` (se ainda não existir) e configurar policies por `company_id` ou por pasta por empresa.

3. **RPCs opcionais (performance)**
   - Se as telas de fluxo de caixa ou resumo financeiro ficarem lentas, dá para criar funções SQL `get_cash_flow` e `get_financial_summary` no Supabase e chamar via RPC em vez de buscar muitos dados no client.

4. **Testes**
   - Criar um contrato ativo (gerar parcelas), registrar um pagamento, verificar quitação e fechamento do contrato; conferir saldo do cliente e relatórios.

---

## Resumo rápido

| Item                         | Status        |
|-----------------------------|---------------|
| Tipos e enums               | Pronto        |
| Tabela `installment_payments`| Existe no banco |
| RLS `installment_payments`  | Verificar/criar no Dashboard (SQL acima) |
| contracts.ts (CRUD + parcelas) | Pronto     |
| installments.ts (update/cancel) | Pronto   |
| payments.ts                  | Pronto        |
| customers.ts (balance)       | Pronto        |
| reports.ts                   | Pronto        |
| users.ts                     | Pronto        |
| files.ts                     | Pronto        |
| Integração no front          | Pendente      |

Qualquer dúvida sobre uma função específica, consulte o arquivo em `src/lib/supabase/` ou os tipos em `src/types/`.
