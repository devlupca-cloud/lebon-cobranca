-- Auditoria de RLS: lista tabelas do schema public, status de RLS, e quantas
-- policies cada uma tem. Usado para identificar gaps em tabelas que nao
-- estao versionadas em migrations.
SELECT
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS policy_count,
  COALESCE(
    string_agg(
      p.policyname || '(' || p.cmd || ')',
      ', ' ORDER BY p.policyname
    ),
    '(nenhuma)'
  ) AS policies
FROM pg_tables t
LEFT JOIN pg_policies p
  ON p.schemaname = t.schemaname
 AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.rowsecurity, COUNT(p.policyname), t.tablename;
