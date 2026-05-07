-- 1. RLS na tabela `companies`
-- Antes: RLS desativado, qualquer usuario autenticado podia listar nome,
-- legal_name, tax_id (CNPJ) de TODAS as empresas no banco.
-- Agora: usuario so ve a propria empresa (linkada via company_users).

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_self_only" ON public.companies;
CREATE POLICY "companies_self_only" ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM public.company_users
       WHERE id = auth.uid() AND is_active = true
    )
  );

-- 2. Tornar buckets de Storage privados
-- O codigo (src/lib/supabase/files.ts e storage.ts) ja foi atualizado para
-- gerar signed URLs on-demand via createSignedUrl. Tornar os buckets
-- privados ativa o gate de RLS para acesso (antes era contornavel via URL
-- publica direta).

UPDATE storage.buckets
   SET public = false
 WHERE name IN ('file', 'photo_user');
