-- Garante que o usuário possa ler a própria linha em company_users.
-- Em este projeto: company_users.id = auth.uid() (id da linha é o id do usuário no Auth).
-- Necessário para as policies das outras tabelas que fazem SELECT em company_users.

ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own company_users row" ON public.company_users;

CREATE POLICY "Users can read own company_users row" ON public.company_users
  FOR SELECT
  USING (id = auth.uid());
