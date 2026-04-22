-- RPC: cria acordo de renegociação sobre parcelas em aberto.
-- Marca as parcelas originais como RENEGOTIATED (status_id=6) e cria novas parcelas
-- com origin_id=RENEGOTIATION (2). Recalcula outstanding_balance do cliente.
--
-- Status: OPEN=1, PARTIAL=2, PAID=3, OVERDUE=4, CANCELED=5, RENEGOTIATED=6.
-- Origin: CONTRACT=1, RENEGOTIATION=2, MANUAL=3.

CREATE OR REPLACE FUNCTION public.create_renegotiation_agreement(
  p_company_id uuid,
  p_contract_id uuid,
  p_original_installment_ids uuid[],
  p_new_installments jsonb,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_customer_id uuid;
  v_next_number int;
  v_inserted_ids uuid[] := ARRAY[]::uuid[];
  v_new_row jsonb;
  v_installment_rec record;
  v_new_id uuid;
  v_balance numeric;
  v_count int;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  -- Valida entrada
  IF p_original_installment_ids IS NULL OR cardinality(p_original_installment_ids) = 0 THEN
    RAISE EXCEPTION 'É necessário selecionar pelo menos uma parcela para renegociar.';
  END IF;

  IF p_new_installments IS NULL OR jsonb_array_length(p_new_installments) = 0 THEN
    RAISE EXCEPTION 'É necessário informar as novas parcelas.';
  END IF;

  -- Valida que o contrato pertence à company
  SELECT customer_id INTO v_customer_id
  FROM public.contracts
  WHERE id = p_contract_id
    AND company_id = p_company_id
    AND deleted_at IS NULL;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Contrato não encontrado para esta empresa.';
  END IF;

  -- Valida que as parcelas pertencem ao contrato e estão em aberto/atraso/parcial
  SELECT COUNT(*) INTO v_count
  FROM public.contract_installments
  WHERE id = ANY(p_original_installment_ids)
    AND contract_id = p_contract_id
    AND company_id = p_company_id
    AND deleted_at IS NULL
    AND status_id IN (1, 2, 4);

  IF v_count <> cardinality(p_original_installment_ids) THEN
    RAISE EXCEPTION 'Uma ou mais parcelas selecionadas são inválidas (não pertencem ao contrato, já foram pagas ou renegociadas).';
  END IF;

  -- Marca originais como RENEGOTIATED
  UPDATE public.contract_installments
  SET status_id = 6,
      notes = COALESCE(notes, '') ||
              CASE WHEN COALESCE(notes, '') = '' THEN '' ELSE E'\n' END ||
              'Renegociada em ' || to_char(CURRENT_DATE, 'DD/MM/YYYY') ||
              COALESCE(' — ' || p_notes, ''),
      updated_at = NOW()
  WHERE id = ANY(p_original_installment_ids)
    AND contract_id = p_contract_id
    AND company_id = p_company_id;

  -- Próximo número de parcela
  SELECT COALESCE(MAX(installment_number), 0) + 1 INTO v_next_number
  FROM public.contract_installments
  WHERE contract_id = p_contract_id
    AND company_id = p_company_id;

  -- Insere novas parcelas
  FOR v_installment_rec IN
    SELECT
      (value->>'due_date')::date AS due_date,
      (value->>'amount')::numeric AS amount,
      ord
    FROM jsonb_array_elements(p_new_installments) WITH ORDINALITY AS t(value, ord)
    ORDER BY ord
  LOOP
    IF v_installment_rec.due_date IS NULL OR v_installment_rec.amount IS NULL OR v_installment_rec.amount <= 0 THEN
      RAISE EXCEPTION 'Nova parcela inválida (valor ou data ausentes).';
    END IF;

    INSERT INTO public.contract_installments (
      contract_id,
      company_id,
      installment_number,
      due_date,
      amount,
      amount_paid,
      status_id,
      origin_id,
      notes
    ) VALUES (
      p_contract_id,
      p_company_id,
      v_next_number,
      v_installment_rec.due_date,
      v_installment_rec.amount,
      0,
      1,
      2,
      p_notes
    )
    RETURNING id INTO v_new_id;

    v_inserted_ids := v_inserted_ids || v_new_id;
    v_next_number := v_next_number + 1;
  END LOOP;

  -- Se o contrato estava fechado/quitado, reabre
  UPDATE public.contracts
  SET status_id = 2, updated_at = NOW()
  WHERE id = p_contract_id
    AND company_id = p_company_id
    AND status_id = 3;

  -- Recalcula outstanding_balance do cliente
  SELECT COALESCE(SUM(ci.amount - ci.amount_paid), 0) INTO v_balance
  FROM public.contract_installments ci
  JOIN public.contracts c
    ON c.id = ci.contract_id
   AND c.company_id = p_company_id
   AND c.deleted_at IS NULL
  WHERE c.customer_id = v_customer_id
    AND ci.status_id IN (1, 2, 4)
    AND ci.deleted_at IS NULL;

  UPDATE public.customers
  SET outstanding_balance = COALESCE(v_balance, 0), updated_at = NOW()
  WHERE id = v_customer_id
    AND company_id = p_company_id;

  v_new_row := jsonb_build_object(
    'contract_id', p_contract_id,
    'renegotiated_ids', p_original_installment_ids,
    'new_installment_ids', v_inserted_ids,
    'new_count', cardinality(v_inserted_ids)
  );

  RETURN v_new_row;
END;
$$;

COMMENT ON FUNCTION public.create_renegotiation_agreement IS
  'Cria acordo de renegociação: marca parcelas como RENEGOTIATED e cria novas com origin RENEGOTIATION. Atualiza saldo do cliente.';

GRANT EXECUTE ON FUNCTION public.create_renegotiation_agreement TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_renegotiation_agreement TO service_role;
