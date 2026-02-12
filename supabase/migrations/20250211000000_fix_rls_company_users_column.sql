-- Fix RLS: column cu.user_id does not exist
-- Em este projeto: company_users.id = auth.uid() (id da linha é o id do usuário no Auth).
-- A tabela não tem coluna user_id; as policies devem usar id = auth.uid().

-- 1. installment_payments
DROP POLICY IF EXISTS "company_access" ON public.installment_payments;

CREATE POLICY "company_access" ON public.installment_payments
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users cu
      WHERE cu.id = auth.uid() AND cu.is_active = true
    )
  );
