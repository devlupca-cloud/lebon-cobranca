-- RPC: estorna um pagamento (delete + recalcula parcela + reabre contrato se estava fechado + atualiza saldo do cliente).
-- Uma única chamada no lugar de várias requests.
-- Status parcela: OPEN=1, PARTIAL=2, PAID=3, OVERDUE=4, CANCELED=5. Contrato: ACTIVE=2, CLOSED=3.

CREATE OR REPLACE FUNCTION public.revert_payment(
  p_payment_id uuid,
  p_company_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_installment_id uuid;
  v_contract_id uuid;
  v_customer_id uuid;
  v_total_paid numeric;
  v_amount numeric;
  v_status_id int;
  v_paid_at date;
  v_balance numeric;
  v_was_closed boolean;
BEGIN
  -- 1. Get payment and delete
  SELECT installment_id INTO v_installment_id
  FROM public.installment_payments
  WHERE id = p_payment_id AND company_id = p_company_id;

  IF v_installment_id IS NULL THEN
    RAISE EXCEPTION 'Pagamento não encontrado.';
  END IF;

  DELETE FROM public.installment_payments
  WHERE id = p_payment_id AND company_id = p_company_id;

  -- 2. Recalculate installment
  SELECT COALESCE(SUM(paid_amount), 0) INTO v_total_paid
  FROM public.installment_payments
  WHERE installment_id = v_installment_id AND company_id = p_company_id;

  SELECT ci.amount, ci.contract_id INTO v_amount, v_contract_id
  FROM public.contract_installments ci
  WHERE ci.id = v_installment_id AND ci.company_id = p_company_id;

  IF v_amount IS NOT NULL THEN
    v_paid_at := NULL;
    IF v_total_paid >= v_amount THEN
      v_status_id := 3;
      v_paid_at := CURRENT_DATE;
    ELSIF v_total_paid > 0 THEN
      v_status_id := 2;
    ELSE
      v_status_id := 1;
    END IF;

    UPDATE public.contract_installments
    SET amount_paid = v_total_paid, status_id = v_status_id, paid_at = v_paid_at
    WHERE id = v_installment_id AND company_id = p_company_id;
  END IF;

  -- 3. Reopen contract if it was closed (now has non-paid installments again)
  SELECT (c.status_id = 3) INTO v_was_closed
  FROM public.contracts c
  WHERE c.id = v_contract_id AND c.company_id = p_company_id;

  IF v_was_closed THEN
    UPDATE public.contracts
    SET status_id = 2, updated_at = NOW()
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
END;
$$;

COMMENT ON FUNCTION public.revert_payment IS 'Estorna um pagamento: remove registro, recalcula parcela, reabre contrato se fechado e atualiza saldo do cliente. Uma chamada única.';

GRANT EXECUTE ON FUNCTION public.revert_payment TO authenticated;
GRANT EXECUTE ON FUNCTION public.revert_payment TO service_role;
