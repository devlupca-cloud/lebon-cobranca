-- Limpa os dados da empresa vinculada ao usuário devlup@devlup.ca.
-- NÃO apaga: auth.users, company_users (seu login e vínculo com a empresa continuam).
-- Ordem: respeita FKs (pagamentos → parcelas → contratos → despesas → clientes → endereços).

DO $$
DECLARE
  v_company_id uuid;
  v_deleted_payments int;
  v_deleted_installments int;
  v_deleted_contracts int;
  v_deleted_expenses int;
  v_deleted_customers int;
  v_deleted_addresses int;
BEGIN
  -- Pega o company_id do usuário devlup@devlup.ca (pela tabela company_users + auth.users)
  SELECT cu.company_id INTO v_company_id
  FROM public.company_users cu
  JOIN auth.users u ON u.id = cu.id
  WHERE u.email = 'devlup@devlup.ca'
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário devlup@devlup.ca não encontrado ou sem empresa vinculada em company_users.';
  END IF;

  -- 1. Pagamentos de parcelas
  WITH d AS (DELETE FROM public.installment_payments WHERE company_id = v_company_id RETURNING 1)
  SELECT count(*)::int INTO v_deleted_payments FROM d;

  -- 2. Parcelas de contratos
  WITH d AS (DELETE FROM public.contract_installments WHERE company_id = v_company_id RETURNING 1)
  SELECT count(*)::int INTO v_deleted_installments FROM d;

  -- 3. Contratos
  WITH d AS (DELETE FROM public.contracts WHERE company_id = v_company_id RETURNING 1)
  SELECT count(*)::int INTO v_deleted_contracts FROM d;

  -- 4. Contas a pagar (despesas)
  WITH d AS (DELETE FROM public.company_expenses WHERE company_id = v_company_id RETURNING 1)
  SELECT count(*)::int INTO v_deleted_expenses FROM d;

  -- 5. Clientes
  WITH d AS (DELETE FROM public.customers WHERE company_id = v_company_id RETURNING 1)
  SELECT count(*)::int INTO v_deleted_customers FROM d;

  -- 6. Endereços (se a tabela tiver company_id)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'addresses') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'company_id') THEN
      WITH d AS (DELETE FROM public.addresses WHERE company_id = v_company_id RETURNING 1)
      SELECT count(*)::int INTO v_deleted_addresses FROM d;
    ELSE
      v_deleted_addresses := 0;
    END IF;
  ELSE
    v_deleted_addresses := 0;
  END IF;

  RAISE NOTICE 'Limpeza concluída para company_id %. Removidos: % pagamentos, % parcelas, % contratos, % despesas, % clientes, % endereços.',
    v_company_id, v_deleted_payments, v_deleted_installments, v_deleted_contracts, v_deleted_expenses, v_deleted_customers, v_deleted_addresses;
END $$;
