-- RPC: retorna o perfil (company_users) do usuário autenticado em uma única query.
-- Usada pelo dashboard para evitar múltiplas chamadas (getUser + 2 selects em company_users).

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_row record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT company_id, name, email, photo_user
  INTO v_row
  FROM public.company_users
  WHERE is_active = true
    AND (id = v_uid OR user_id = v_uid)
  LIMIT 1;

  IF v_row IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'company_id', v_row.company_id,
    'name', v_row.name,
    'email', v_row.email,
    'photo_user', v_row.photo_user
  );
END;
$$;

COMMENT ON FUNCTION public.get_my_profile IS 'Retorna company_id, name, email, photo_user do usuário autenticado (company_users). Uma única query.';

GRANT EXECUTE ON FUNCTION public.get_my_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile TO service_role;
