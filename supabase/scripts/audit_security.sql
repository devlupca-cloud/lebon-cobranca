-- 1. Schema da tabela companies (avaliar se precisa RLS)
SELECT 'companies_schema' AS check, column_name, data_type
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'companies'
 ORDER BY ordinal_position;

-- 2. Quantas empresas existem
SELECT 'companies_count' AS check, count(*)::text AS value FROM public.companies;

-- 3. Policies de company_users (incluindo se INSERT existe)
SELECT 'company_users_policies' AS check,
       policyname, cmd,
       COALESCE(qual::text, '(none)') AS using_expr,
       COALESCE(with_check::text, '(none)') AS check_expr
  FROM pg_policies
 WHERE schemaname = 'public' AND tablename = 'company_users'
 ORDER BY cmd, policyname;

-- 4. Storage policies aplicadas (file e photo_user)
SELECT 'storage_policies' AS check, policyname, cmd
  FROM pg_policies
 WHERE schemaname = 'storage' AND tablename = 'objects'
 ORDER BY policyname;

-- 5. Buckets e seu estado public/private
SELECT 'buckets_state' AS check, name, public::text AS is_public
  FROM storage.buckets
 ORDER BY name;
