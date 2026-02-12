-- RPC: registra pagamento, recalcula parcela, fecha contrato se quitado e atualiza saldo do cliente.
-- Uma única chamada no lugar de dezenas de requests.
-- Status: OPEN=1, PARTIAL=2, PAID=3, OVERDUE=4, CANCELED=5. CONTRACT CLOSED=3.

CREATE OR REPLACE FUNCTION public.record_payment(
  p_company_id uuid,
  p_installment_id uuid,
  p_paid_amount numeric,
  p_paid_at date DEFAULT CURRENT_DATE,
  p_payment_method_id int DEFAULT 1,
  p_received_by_user_id uuid DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_received_by uuid;
  v_payment_row jsonb;
  v_payment_rec record;
  v_total_paid numeric;
  v_amount numeric;
  v_contract_id uuid;
  v_customer_id uuid;
  v_status_id int;
  v_paid_at date;
  v_active_count bigint;
  v_paid_count bigint;
  v_balance numeric;
BEGIN
  v_received_by := COALESCE(p_received_by_user_id, auth.uid());
  IF v_received_by IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado. Não é possível registrar o pagamento.';
  END IF;

  -- 1. Insert payment
  INSERT INTO public.installment_payments (
    company_id,
    installment_id,
    paid_amount,
    paid_at,
    payment_method_id,
    received_by_user_id,
    reference,
    notes
  ) VALUES (
    p_company_id,
    p_installment_id,
    p_paid_amount,
    COALESCE(p_paid_at, CURRENT_DATE),
    p_payment_method_id,
    v_received_by,
    p_reference,
    p_notes
  )
  RETURNING * INTO v_payment_rec;
  v_payment_row := to_jsonb(v_payment_rec);

  -- 2. Recalculate installment
  SELECT SUM(paid_amount) INTO v_total_paid
  FROM public.installment_payments
  WHERE installment_id = p_installment_id AND company_id = p_company_id;

  SELECT ci.amount, ci.contract_id INTO v_amount, v_contract_id
  FROM public.contract_installments ci
  WHERE ci.id = p_installment_id AND ci.company_id = p_company_id;

  IF v_amount IS NULL THEN
    RETURN v_payment_row;
  END IF;

  v_paid_at := NULL;
  IF v_total_paid >= v_amount THEN
    v_status_id := 3; -- PAID
    v_paid_at := CURRENT_DATE;
  ELSIF v_total_paid > 0 THEN
    v_status_id := 2; -- PARTIAL
  ELSE
    v_status_id := 1; -- OPEN
  END IF;

  UPDATE public.contract_installments
  SET amount_paid = v_total_paid, status_id = v_status_id, paid_at = v_paid_at
  WHERE id = p_installment_id AND company_id = p_company_id;

  -- 3. Close contract if all installments paid
  SELECT COUNT(*) INTO v_active_count
  FROM public.contract_installments
  WHERE contract_id = v_contract_id AND status_id != 5 AND deleted_at IS NULL;

  SELECT COUNT(*) INTO v_paid_count
  FROM public.contract_installments
  WHERE contract_id = v_contract_id AND status_id = 3 AND deleted_at IS NULL;

  IF v_active_count > 0 AND v_active_count = v_paid_count THEN
    UPDATE public.contracts
    SET status_id = 3, updated_at = NOW()
    WHERE id = v_contract_id AND company_id = p_company_id;
  END IF;

  -- 4. Recalculate customer outstanding balance
  SELECT customer_id INTO v_customer_id
  FROM public.contracts
  WHERE id = v_contract_id AND company_id = p_company_id;

  IF v_customer_id IS NOT NULL THEN
    SELECT COALESCE(SUM(ci.amount - ci.amount_paid), 0) INTO v_balance
    FROM public.contract_installments ci
    JOIN public.contracts c ON c.id = ci.contract_id AND c.company_id = p_company_id AND c.deleted_at IS NULL
    WHERE c.customer_id = v_customer_id
      AND ci.status_id IN (1, 2, 4)
      AND ci.deleted_at IS NULL;

    UPDATE public.customers
    SET outstanding_balance = COALESCE(v_balance, 0), updated_at = NOW()
    WHERE id = v_customer_id AND company_id = p_company_id;
  END IF;

  RETURN v_payment_row;
END;
$$;

COMMENT ON FUNCTION public.record_payment IS 'Registra pagamento, recalcula parcela, fecha contrato se quitado e atualiza saldo do cliente. Uma chamada única.';

GRANT EXECUTE ON FUNCTION public.record_payment TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment TO service_role;
