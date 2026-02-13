-- Garantir que a RPC get_customers exclua clientes com exclusão lógica (deleted_at).
-- Se a função get_customers já existir no seu projeto, edite-a no SQL Editor e inclua
-- na cláusula WHERE do SELECT em customers: AND deleted_at IS NULL.
--
-- Exemplo (ajuste conforme a assinatura real da sua get_customers):
--
-- CREATE OR REPLACE FUNCTION get_customers(...)
-- RETURNS ... AS $$
--   SELECT ... FROM customers
--   WHERE company_id = p_company_id
--     AND deleted_at IS NULL  -- obrigatório para exclusão lógica
--     ...
-- $$ LANGUAGE sql;
--
-- Sem esse filtro, clientes "excluídos" continuariam aparecendo na listagem e em autocompletes.

COMMENT ON TABLE public.customers IS 'Clientes. Sempre filtrar deleted_at IS NULL em listagens e relatórios (exclusão lógica).';
