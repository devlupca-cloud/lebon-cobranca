-- CRITICO: varias tabelas tem policies declaradas mas RLS DESATIVADO,
-- o que torna as policies inertes. Auditoria de 2026-05-07 detectou que
-- customers, contracts, contract_installments, addresses, customer_files
-- e contract_files estavam com `rowsecurity = false`, expondo dados de
-- todas as empresas para qualquer usuario autenticado.
--
-- Esta migration ATIVA RLS em todas essas tabelas. As policies ja
-- existentes (`*_company_isolation`, `company_access`) passam a ser
-- aplicadas a partir daqui.
--
-- IDEMPOTENTE: ENABLE ROW LEVEL SECURITY em tabela que ja tem RLS ligado
-- e no-op.

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_files ENABLE ROW LEVEL SECURITY;

-- Tabelas de lookup (status, payment_methods, etc.) sao publicas leitura,
-- mas merecem ser explicitamente protegidas contra escrita. Verificar
-- caso a caso depois — fora do escopo deste fix critico.

-- Sanity check: confirma que as 6 tabelas estao agora com RLS ON.
DO $$
DECLARE
  v_off text[];
BEGIN
  SELECT array_agg(tablename) INTO v_off
    FROM pg_tables
   WHERE schemaname = 'public'
     AND tablename IN (
       'customers', 'contracts', 'contract_installments',
       'addresses', 'customer_files', 'contract_files'
     )
     AND rowsecurity = false;
  IF v_off IS NOT NULL THEN
    RAISE EXCEPTION 'RLS ainda desativado em: %', v_off;
  END IF;
END $$;
