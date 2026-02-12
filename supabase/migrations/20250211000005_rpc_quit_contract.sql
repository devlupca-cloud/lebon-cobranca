-- RPC: quitar contrato = marca todas as parcelas em aberto como pagas (uma chamada por parcela via record_payment) e fecha o contrato.
-- Uma única chamada do cliente; no servidor chama record_payment para cada parcela com saldo.

CREATE OR REPLACE FUNCTION public.quit_contract(
  p_contract_id uuid,
  p_company_id uuid,
  p_payment_method_id int DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  r record;
  v_open_amt numeric;
  v_count int := 0;
BEGIN
  FOR r IN
    SELECT id, amount, amount_paid
    FROM public.contract_installments
    WHERE contract_id = p_contract_id
      AND company_id = p_company_id
      AND deleted_at IS NULL
      AND status_id != 5
      AND amount_paid < amount
  LOOP
    v_open_amt := r.amount - r.amount_paid;
    IF v_open_amt > 0 THEN
      PERFORM public.record_payment(
        p_company_id,
        r.id,
        v_open_amt,
        CURRENT_DATE,
        p_payment_method_id,
        NULL,
        NULL,
        'Quitação total'
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('payments_count', v_count, 'closed', true);
END;
$$;

COMMENT ON FUNCTION public.quit_contract IS 'Marca todas as parcelas em aberto como pagas (via record_payment) e fecha o contrato. Uma chamada do cliente.';

GRANT EXECUTE ON FUNCTION public.quit_contract TO authenticated;
GRANT EXECUTE ON FUNCTION public.quit_contract TO service_role;
