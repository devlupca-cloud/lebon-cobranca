-- Permite que usuários da mesma empresa atualizem outros (nome, e-mail, função) em Cadastrar Acesso.
-- Sem esta policy, o UPDATE afeta 0 linhas e o cliente retorna PGRST116.

DROP POLICY IF EXISTS "Users can update company members" ON public.company_users;

CREATE POLICY "Users can update company members" ON public.company_users
  FOR UPDATE
  USING (company_id IN (SELECT get_company_ids_for_current_user()))
  WITH CHECK (company_id IN (SELECT get_company_ids_for_current_user()));
