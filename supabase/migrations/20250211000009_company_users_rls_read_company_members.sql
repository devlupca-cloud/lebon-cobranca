-- Permite que o usuário veja todos os usuários cadastrados na mesma empresa (lista em Cadastrar Acesso).
-- A policy "Users can read own company_users row" já permite ler a própria linha; o subquery usa isso para obter o company_id.

DROP POLICY IF EXISTS "Users can read company members" ON public.company_users;

CREATE POLICY "Users can read company members" ON public.company_users
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users
      WHERE id = auth.uid() AND is_active = true
    )
  );
