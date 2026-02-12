-- Fix RLS: adiciona WITH CHECK para INSERT e corrige outras tabelas do fluxo de pagamento
-- Em este projeto: company_users.id = auth.uid() (id da linha é o id do usuário no Auth).

-- Helper: expressão comum para acesso por company
-- company_id IN (SELECT company_id FROM company_users WHERE id = auth.uid() AND is_active)

-- 1. installment_payments - adiciona WITH CHECK (necessário para INSERT)
DROP POLICY IF EXISTS "company_access" ON public.installment_payments;

CREATE POLICY "company_access" ON public.installment_payments
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- 2. contract_installments - corrige se policy existir com user_id
DO $$
BEGIN
  -- Remove policies que usam user_id (podem ter nomes diferentes)
  DROP POLICY IF EXISTS "company_access" ON public.contract_installments;
  DROP POLICY IF EXISTS "Enable read access for company users" ON public.contract_installments;
  DROP POLICY IF EXISTS "Enable insert for company users" ON public.contract_installments;
  DROP POLICY IF EXISTS "Enable update for company users" ON public.contract_installments;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "company_access" ON public.contract_installments
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- 3. contracts - garante policy correta
DO $$
BEGIN
  DROP POLICY IF EXISTS "company_access" ON public.contracts;
  DROP POLICY IF EXISTS "Enable read access for company users" ON public.contracts;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "company_access" ON public.contracts
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- 4. customers - garante policy correta
DO $$
BEGIN
  DROP POLICY IF EXISTS "company_access" ON public.customers;
  DROP POLICY IF EXISTS "Enable read access for company users" ON public.customers;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "company_access" ON public.customers
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE id = auth.uid() AND is_active = true
    )
  );
