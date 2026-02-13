-- RLS para Storage: buckets "file" (documentos) e "photo_user" (foto do usuário).
-- Permite usuários autenticados fazer upload, leitura e exclusão.
-- Execute no SQL Editor do Supabase se não usar supabase db push.

-- Bucket "file" (documentos de clientes/contratos)
CREATE POLICY "file: authenticated insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'file');

CREATE POLICY "file: authenticated select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'file');

CREATE POLICY "file: authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'file');

-- Bucket "photo_user" (foto do perfil)
CREATE POLICY "photo_user: authenticated insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photo_user');

CREATE POLICY "photo_user: authenticated select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'photo_user');

CREATE POLICY "photo_user: authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'photo_user');

CREATE POLICY "photo_user: authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'photo_user');
