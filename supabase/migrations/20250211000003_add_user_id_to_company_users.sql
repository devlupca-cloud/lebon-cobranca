-- Adiciona coluna user_id em company_users para compatibilidade com policies que usam cu.user_id.
-- Em este projeto: company_users.id = auth.uid(), então user_id = id (redundante mas resolve o erro 42703).

ALTER TABLE public.company_users
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Preenche user_id com o mesmo valor de id (id = auth.uid() neste projeto)
UPDATE public.company_users
SET user_id = id
WHERE user_id IS NULL;

COMMENT ON COLUMN public.company_users.user_id IS 'Mesmo que id neste projeto (auth.uid()). Existe para compatibilidade com RLS policies que usam user_id.';
