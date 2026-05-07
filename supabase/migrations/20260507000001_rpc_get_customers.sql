-- Versiona a RPC get_customers (antes definida apenas no Dashboard).
-- Contrato consumido por src/lib/supabase/customers.ts:
--   params: p_company_id, p_limit, p_offset, p_name, p_cpf, p_cnpj, p_status_id
--   retorno: jsonb { total, limit, offset, data: [CustomerFromAPI] }
--   onde CustomerFromAPI tem todos os campos de customers (incl. rg, birthplace,
--   system_code) + status (id, name) + address (sem id_address e status_id).
--
-- Defesa:
--   - SECURITY INVOKER (RLS de customers se aplica ao auth.uid()).
--   - Validacao explicita de company ownership ao inicio.
--   - search_path = public (mitiga search_path injection).

-- DROP necessario porque a funcao pode existir no remoto com return type
-- diferente (versao legada estava no Dashboard, nao versionada). Usa CASCADE
-- para remover qualquer overload com signature diferente.
DO $$
DECLARE
  v_sig text;
BEGIN
  FOR v_sig IN
    SELECT pg_get_function_identity_arguments(p.oid)
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'get_customers'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.get_customers(%s) CASCADE', v_sig);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.get_customers(
  p_company_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_name text DEFAULT NULL,
  p_cpf text DEFAULT NULL,
  p_cnpj text DEFAULT NULL,
  p_status_id integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_limit integer := COALESCE(p_limit, 20);
  v_offset integer := COALESCE(p_offset, 0);
  v_total bigint := 0;
  v_data jsonb := '[]'::jsonb;
BEGIN
  -- Clamp limite (defesa contra abuso de paginacao)
  IF v_limit > 200 THEN v_limit := 200; END IF;
  IF v_limit < 1 THEN v_limit := 20; END IF;
  IF v_offset < 0 THEN v_offset := 0; END IF;

  -- Validacao de ownership: o auth.uid() precisa pertencer a p_company_id ativa.
  IF p_company_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE id = auth.uid()
      AND company_id = p_company_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado a esta empresa.' USING ERRCODE = '42501';
  END IF;

  -- Total
  SELECT COUNT(*)
    INTO v_total
    FROM public.customers c
   WHERE c.company_id = p_company_id
     AND c.deleted_at IS NULL
     AND (
       p_name IS NULL OR (
         c.full_name ILIKE '%' || p_name || '%'
         OR c.legal_name ILIKE '%' || p_name || '%'
         OR c.trade_name ILIKE '%' || p_name || '%'
       )
     )
     AND (p_cpf IS NULL OR c.cpf ILIKE '%' || p_cpf || '%')
     AND (p_cnpj IS NULL OR c.cnpj ILIKE '%' || p_cnpj || '%')
     AND (p_status_id IS NULL OR c.status_id = p_status_id);

  -- Dados paginados, com status e address aninhados.
  SELECT COALESCE(jsonb_agg(row_data ORDER BY created_at DESC), '[]'::jsonb)
    INTO v_data
    FROM (
      SELECT
        c.created_at,
        jsonb_build_object(
          'id', c.id,
          'created_at', c.created_at,
          'updated_at', c.updated_at,
          'deleted_at', c.deleted_at,
          'company_id', c.company_id,
          'person_type', c.person_type,
          'cpf', c.cpf,
          'cnpj', c.cnpj,
          'rg', c.rg,
          'legal_name', c.legal_name,
          'trade_name', c.trade_name,
          'full_name', c.full_name,
          'state_registration', c.state_registration,
          'birth_date', c.birth_date,
          'birthplace', c.birthplace,
          'occupation', c.occupation,
          'referral', c.referral,
          'phone', c.phone,
          'mobile', c.mobile,
          'email', c.email,
          'customer_code', c.customer_code,
          'system_code', c.system_code,
          'credit_limit', c.credit_limit,
          'outstanding_balance', c.outstanding_balance,
          'marital_status_id', c.marital_status_id,
          'status', CASE
            WHEN cs.id IS NOT NULL THEN
              jsonb_build_object('id', cs.id, 'name', cs.name)
            ELSE NULL
          END,
          'address', CASE
            WHEN a.id IS NOT NULL THEN
              jsonb_build_object(
                'id', a.id,
                'street', a.street,
                'number', a.number,
                'neighbourhood', a.neighbourhood,
                'city', a.city,
                'state', a.state,
                'zip_code', a.zip_code,
                'additional_info', a.additional_info
              )
            ELSE NULL
          END
        ) AS row_data
      FROM public.customers c
      LEFT JOIN public.customer_statuses cs ON cs.id = c.status_id
      LEFT JOIN public.addresses a ON a.id = c.address_id
      WHERE c.company_id = p_company_id
        AND c.deleted_at IS NULL
        AND (
          p_name IS NULL OR (
            c.full_name ILIKE '%' || p_name || '%'
            OR c.legal_name ILIKE '%' || p_name || '%'
            OR c.trade_name ILIKE '%' || p_name || '%'
          )
        )
        AND (p_cpf IS NULL OR c.cpf ILIKE '%' || p_cpf || '%')
        AND (p_cnpj IS NULL OR c.cnpj ILIKE '%' || p_cnpj || '%')
        AND (p_status_id IS NULL OR c.status_id = p_status_id)
      ORDER BY c.created_at DESC
      LIMIT v_limit
      OFFSET v_offset
    ) sub;

  RETURN jsonb_build_object(
    'total', v_total,
    'limit', v_limit,
    'offset', v_offset,
    'data', v_data
  );
END;
$$;

COMMENT ON FUNCTION public.get_customers(uuid, integer, integer, text, text, text, integer) IS
  'Lista clientes da empresa do usuario (validada via company_users) com status/endereco aninhados. Retorna jsonb { total, limit, offset, data: [...] }.';

GRANT EXECUTE ON FUNCTION public.get_customers(uuid, integer, integer, text, text, text, integer) TO authenticated;
