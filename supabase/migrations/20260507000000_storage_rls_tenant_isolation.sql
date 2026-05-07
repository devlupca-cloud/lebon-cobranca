-- Storage RLS: isolamento por tenant nos buckets "file" e "photo_user".
-- Substitui policies abertas (qualquer authenticated le/escreve em qualquer objeto)
-- por verificacao de prefixo do path:
--   * file:       customers/{companyId}/...   ou contracts/{companyId}/...   -> companyId em company_users
--   * photo_user: photo/{userId}/...                                          -> userId == auth.uid()
--
-- Padrao do projeto (ver 20250211000001_fix_rls_with_check_and_other_tables.sql):
--   company_users.id = auth.uid() AND is_active = true
--
-- storage.foldername(name) retorna text[] (1-indexed) com os segmentos da path.

-- ───────────────────────── Limpeza das policies antigas ─────────────────────

DROP POLICY IF EXISTS "file: authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "file: authenticated select" ON storage.objects;
DROP POLICY IF EXISTS "file: authenticated delete" ON storage.objects;

DROP POLICY IF EXISTS "photo_user: authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "photo_user: authenticated select" ON storage.objects;
DROP POLICY IF EXISTS "photo_user: authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "photo_user: authenticated delete" ON storage.objects;

-- ───────────────────────── Bucket "file" (documentos) ──────────────────────
-- Path esperado: customers/{companyId}/... ou contracts/{companyId}/...
-- O segundo segmento (foldername(name))[2] e o companyId.

CREATE POLICY "file: tenant insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'file'
  AND (storage.foldername(name))[1] IN ('customers', 'contracts')
  AND (storage.foldername(name))[2] IN (
    SELECT company_id::text FROM public.company_users
    WHERE id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "file: tenant select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'file'
  AND (storage.foldername(name))[2] IN (
    SELECT company_id::text FROM public.company_users
    WHERE id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "file: tenant update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'file'
  AND (storage.foldername(name))[2] IN (
    SELECT company_id::text FROM public.company_users
    WHERE id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  bucket_id = 'file'
  AND (storage.foldername(name))[2] IN (
    SELECT company_id::text FROM public.company_users
    WHERE id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "file: tenant delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'file'
  AND (storage.foldername(name))[2] IN (
    SELECT company_id::text FROM public.company_users
    WHERE id = auth.uid() AND is_active = true
  )
);

-- ───────────────────────── Bucket "photo_user" ─────────────────────────────
-- Path esperado: photo/{userId}/...
-- O segundo segmento e o auth.uid() do dono.

CREATE POLICY "photo_user: owner insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photo_user'
  AND (storage.foldername(name))[1] = 'photo'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "photo_user: owner select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'photo_user'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "photo_user: owner update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'photo_user'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'photo_user'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "photo_user: owner delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'photo_user'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- ───────────────────────── Notas operacionais ──────────────────────────────
-- 1. As fotos do bucket photo_user sao referenciadas por URL publica em
--    company_users.photo_user. Como o bucket continua public para getPublicUrl
--    funcionar, a leitura via URL publica nao usa RLS — quem tiver a URL ve
--    a imagem. Se isso for um problema, trocar para signed URLs (storage
--    .createSignedUrl) e remover o public access do bucket no Dashboard.
-- 2. Mesma observacao para o bucket file: getPublicUrl usado em files.ts
--    retorna URL publica. As policies acima protegem upload/listagem/exclusao
--    via API. Para proteger a leitura por URL, mudar bucket para privado
--    e usar createSignedUrl.
