-- Adiciona ao cadastro de cliente:
--   rg            -> documento RG (texto livre; mantém pontos/traços digitados)
--   birthplace    -> naturalidade (cidade/estado de nascimento)
--   system_code   -> código interno do sistema (ID próprio da operação, distinto
--                    de customer_code que é o "código do cliente" comercial)

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS birthplace text,
  ADD COLUMN IF NOT EXISTS system_code text;

COMMENT ON COLUMN public.customers.rg IS 'Documento RG do cliente (PF). Opcional.';
COMMENT ON COLUMN public.customers.birthplace IS 'Naturalidade: cidade/estado onde o cliente nasceu. Opcional.';
COMMENT ON COLUMN public.customers.system_code IS 'Código interno do sistema (identificador operacional), distinto de customer_code.';

-- ──────────────────────────── RPC: recalcular saldo devedor ────────────────
-- Soma as parcelas em aberto do cliente (status 1 OPEN, 2 PARTIAL, 4 OVERDUE)
-- e grava em customers.outstanding_balance. Retorna o novo saldo.
--
-- Chamada após gerar/ativar contrato, acordos e renegociações.

CREATE OR REPLACE FUNCTION public.recalculate_customer_balance(
  p_customer_id uuid,
  p_company_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
BEGIN
  IF p_customer_id IS NULL OR p_company_id IS NULL THEN
    RAISE EXCEPTION 'customer_id e company_id são obrigatórios.';
  END IF;

  SELECT COALESCE(SUM(ci.amount - ci.amount_paid), 0) INTO v_balance
  FROM public.contract_installments ci
  JOIN public.contracts c
    ON c.id = ci.contract_id
   AND c.company_id = p_company_id
   AND c.deleted_at IS NULL
  WHERE c.customer_id = p_customer_id
    AND ci.status_id IN (1, 2, 4)
    AND ci.deleted_at IS NULL;

  UPDATE public.customers
  SET outstanding_balance = COALESCE(v_balance, 0), updated_at = NOW()
  WHERE id = p_customer_id
    AND company_id = p_company_id;

  RETURN COALESCE(v_balance, 0);
END;
$$;

COMMENT ON FUNCTION public.recalculate_customer_balance IS
  'Recalcula outstanding_balance do cliente a partir das parcelas em aberto (OPEN/PARTIAL/OVERDUE).';

GRANT EXECUTE ON FUNCTION public.recalculate_customer_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_customer_balance TO service_role;
