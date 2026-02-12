-- Corrige recursão infinita na policy "Users can read company members".
-- A policy não pode fazer SELECT em company_users dentro de si mesma.
-- Solução: função SECURITY DEFINER que retorna os company_id do usuário (lê a tabela sem RLS).

CREATE OR REPLACE FUNCTION public.get_company_ids_for_current_user()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.company_users
  WHERE id = auth.uid() AND is_active = true;
$$;

COMMENT ON FUNCTION public.get_company_ids_for_current_user() IS 'Usado por RLS em company_users para evitar recursão; retorna empresas do usuário logado.';

-- Remove a policy que causava recursão
DROP POLICY IF EXISTS "Users can read company members" ON public.company_users;

-- Recria a policy usando a função (sem subquery na mesma tabela)
CREATE POLICY "Users can read company members" ON public.company_users
  FOR SELECT
  USING (company_id IN (SELECT get_company_ids_for_current_user()));
