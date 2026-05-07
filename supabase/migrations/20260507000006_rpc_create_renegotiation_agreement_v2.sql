-- v2 da RPC `create_renegotiation_agreement` — agora cria um CONTRATO NOVO
-- separado, marca o antigo como RENEGOTIATED e recebe metadados do tipo
-- de acordo (amigavel | juridico) e numero de processo (juridico).
--
-- Mudancas vs v1 (20260422000000):
--   * Cria registro novo em `contracts` com `original_contract_id`, `agreement_type`,
--     `process_number`. Status do novo = ACTIVE (2).
--   * Marca contrato antigo como `status_id = 5` (RENEGOTIATED).
--   * Insere parcelas no contrato NOVO (numeracao reinicia em 1).
--   * Retorna o id do contrato novo (alem dos demais campos).
--
-- Nao precisa drop+create — assinatura mudou (parametros novos), entao usa
-- nome diferente nao seria limpo. Como a v1 ainda e chamada pelo codigo,
-- este DROP + CREATE garante que a versao em uso e a v2.

DO $$
DECLARE
  v_sig text;
BEGIN
  FOR v_sig IN
    SELECT pg_get_function_identity_arguments(p.oid)
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'create_renegotiation_agreement'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.create_renegotiation_agreement(%s) CASCADE', v_sig);
  END LOOP;
END $$;

CREATE FUNCTION public.create_renegotiation_agreement(
  p_company_id uuid,
  p_contract_id uuid,
  p_original_installment_ids uuid[],
  p_new_installments jsonb,
  p_agreement_type text DEFAULT NULL,         -- 'amigavel' | 'juridico'
  p_process_number text DEFAULT NULL,         -- so usado quando juridico
  p_total_amount numeric DEFAULT NULL,        -- total do acordo (soma das novas parcelas)
  p_installment_amount numeric DEFAULT NULL,  -- valor de cada parcela do acordo
  p_first_due_date date DEFAULT NULL,         -- primeira data de vencimento
  p_interest_rate numeric DEFAULT NULL,       -- juros simulados (informativo)
  p_admin_fee_rate numeric DEFAULT NULL,      -- taxa admin simulada (informativo)
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_old_contract record;
  v_new_contract_id uuid;
  v_new_contract_number text;
  v_inserted_ids uuid[] := ARRAY[]::uuid[];
  v_new_id uuid;
  v_installment_rec record;
  v_balance numeric;
  v_count int;
  v_total_amount numeric;
  v_installment_count int;
  v_installment_amount numeric;
  v_first_due date;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado.';
  END IF;

  -- Valida tipo de acordo
  IF p_agreement_type IS NOT NULL AND p_agreement_type NOT IN ('amigavel', 'juridico') THEN
    RAISE EXCEPTION 'Tipo de acordo invalido. Use amigavel ou juridico.';
  END IF;

  -- Valida que processo so e fornecido em acordo juridico
  IF p_process_number IS NOT NULL AND p_agreement_type IS DISTINCT FROM 'juridico' THEN
    RAISE EXCEPTION 'Numero de processo so pode ser informado em acordo juridico.';
  END IF;

  IF p_agreement_type = 'juridico' AND (p_process_number IS NULL OR length(trim(p_process_number)) = 0) THEN
    RAISE EXCEPTION 'Acordo juridico exige numero do processo.';
  END IF;

  -- Valida entrada das parcelas
  IF p_original_installment_ids IS NULL OR cardinality(p_original_installment_ids) = 0 THEN
    RAISE EXCEPTION 'E necessario selecionar pelo menos uma parcela para renegociar.';
  END IF;

  IF p_new_installments IS NULL OR jsonb_array_length(p_new_installments) = 0 THEN
    RAISE EXCEPTION 'E necessario informar as novas parcelas.';
  END IF;

  -- Carrega o contrato antigo (e valida ownership)
  SELECT * INTO v_old_contract
    FROM public.contracts
   WHERE id = p_contract_id
     AND company_id = p_company_id
     AND deleted_at IS NULL;

  IF v_old_contract.id IS NULL THEN
    RAISE EXCEPTION 'Contrato nao encontrado para esta empresa.';
  END IF;

  -- Valida que as parcelas pertencem ao contrato e estao em aberto/atraso/parcial
  SELECT COUNT(*) INTO v_count
    FROM public.contract_installments
   WHERE id = ANY(p_original_installment_ids)
     AND contract_id = p_contract_id
     AND company_id = p_company_id
     AND deleted_at IS NULL
     AND status_id IN (1, 2, 4); -- OPEN, PARTIAL, OVERDUE

  IF v_count <> cardinality(p_original_installment_ids) THEN
    RAISE EXCEPTION 'Uma ou mais parcelas selecionadas sao invalidas (nao pertencem ao contrato, ja foram pagas ou renegociadas).';
  END IF;

  -- Calcula totais a partir das parcelas novas se nao foram passados explicitamente
  v_installment_count := jsonb_array_length(p_new_installments);
  IF p_total_amount IS NULL THEN
    SELECT COALESCE(SUM((value->>'amount')::numeric), 0)
      INTO v_total_amount
      FROM jsonb_array_elements(p_new_installments);
  ELSE
    v_total_amount := p_total_amount;
  END IF;
  v_installment_amount := COALESCE(p_installment_amount, ROUND(v_total_amount / NULLIF(v_installment_count, 0), 2));
  v_first_due := COALESCE(
    p_first_due_date,
    ((p_new_installments->0)->>'due_date')::date
  );

  -- Numera o contrato novo (sufixo -A1, -A2... a partir do contrato antigo)
  SELECT (
    COALESCE(v_old_contract.contract_number, p_contract_id::text) ||
    '-A' || (
      SELECT COUNT(*) + 1
        FROM public.contracts
       WHERE original_contract_id = p_contract_id
         AND company_id = p_company_id
         AND deleted_at IS NULL
    )::text
  ) INTO v_new_contract_number;

  -- Cria o contrato novo
  INSERT INTO public.contracts (
    company_id,
    customer_id,
    guarantor_customer_id,
    contract_number,
    inclusion_date,
    contract_amount,
    installments_count,
    admin_fee_rate,
    interest_rate,
    first_due_date,
    total_amount,
    installment_amount,
    residual_amount,
    total_installments,
    bank,
    contract_category_id,
    contract_type_id,
    status_id,
    notes,
    agreement_type,
    process_number,
    original_contract_id
  ) VALUES (
    p_company_id,
    v_old_contract.customer_id,
    v_old_contract.guarantor_customer_id,
    v_new_contract_number,
    CURRENT_DATE,
    v_total_amount,                       -- contract_amount = total do acordo
    v_installment_count,
    COALESCE(p_admin_fee_rate, 0),
    COALESCE(p_interest_rate, 0),
    v_first_due,
    v_total_amount,
    v_installment_amount,
    0,
    v_installment_count,
    v_old_contract.bank,
    v_old_contract.contract_category_id,
    v_old_contract.contract_type_id,
    2,                                    -- ACTIVE
    p_notes,
    p_agreement_type,
    CASE WHEN p_agreement_type = 'juridico' THEN p_process_number ELSE NULL END,
    p_contract_id
  )
  RETURNING id INTO v_new_contract_id;

  -- Marca parcelas originais como RENEGOTIATED (status_id=6 em contract_installments)
  UPDATE public.contract_installments
     SET status_id = 6,
         notes = COALESCE(notes, '') ||
                 CASE WHEN COALESCE(notes, '') = '' THEN '' ELSE E'\n' END ||
                 'Renegociada em ' || to_char(CURRENT_DATE, 'DD/MM/YYYY') ||
                 ' — Acordo ' || COALESCE(p_agreement_type, '') ||
                 COALESCE(' #' || p_process_number, '') ||
                 ' (contrato ' || v_new_contract_number || ')',
         updated_at = NOW()
   WHERE id = ANY(p_original_installment_ids)
     AND contract_id = p_contract_id
     AND company_id = p_company_id;

  -- Insere novas parcelas no CONTRATO NOVO (numeracao 1..N)
  FOR v_installment_rec IN
    SELECT
      (value->>'due_date')::date AS due_date,
      (value->>'amount')::numeric AS amount,
      ord
    FROM jsonb_array_elements(p_new_installments) WITH ORDINALITY AS t(value, ord)
    ORDER BY ord
  LOOP
    IF v_installment_rec.due_date IS NULL OR v_installment_rec.amount IS NULL OR v_installment_rec.amount <= 0 THEN
      RAISE EXCEPTION 'Nova parcela invalida (valor ou data ausentes).';
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
      v_new_contract_id,
      p_company_id,
      v_installment_rec.ord::int,
      v_installment_rec.due_date,
      v_installment_rec.amount,
      0,
      1,                                  -- OPEN
      2,                                  -- RENEGOTIATION
      p_notes
    )
    RETURNING id INTO v_new_id;

    v_inserted_ids := v_inserted_ids || v_new_id;
  END LOOP;

  -- Marca contrato ANTIGO como RENEGOTIATED (status_id=5 em contracts)
  UPDATE public.contracts
     SET status_id = 5,
         updated_at = NOW()
   WHERE id = p_contract_id
     AND company_id = p_company_id;

  -- Recalcula outstanding_balance do cliente (todas as parcelas em aberto
  -- de TODOS os contratos ativos do cliente — incluindo o novo).
  SELECT COALESCE(SUM(ci.amount - ci.amount_paid), 0) INTO v_balance
    FROM public.contract_installments ci
    JOIN public.contracts c
      ON c.id = ci.contract_id
     AND c.company_id = p_company_id
     AND c.deleted_at IS NULL
   WHERE c.customer_id = v_old_contract.customer_id
     AND ci.status_id IN (1, 2, 4)
     AND ci.deleted_at IS NULL;

  UPDATE public.customers
     SET outstanding_balance = COALESCE(v_balance, 0),
         updated_at = NOW()
   WHERE id = v_old_contract.customer_id
     AND company_id = p_company_id;

  RETURN jsonb_build_object(
    'old_contract_id', p_contract_id,
    'new_contract_id', v_new_contract_id,
    'new_contract_number', v_new_contract_number,
    'agreement_type', p_agreement_type,
    'process_number', p_process_number,
    'renegotiated_ids', p_original_installment_ids,
    'new_installment_ids', v_inserted_ids,
    'new_count', cardinality(v_inserted_ids)
  );
END;
$$;

COMMENT ON FUNCTION public.create_renegotiation_agreement(uuid, uuid, uuid[], jsonb, text, text, numeric, numeric, date, numeric, numeric, text) IS
  'v2: cria contrato novo a partir de acordo, marca antigo como RENEGOTIATED, retorna IDs e numero do novo contrato.';

GRANT EXECUTE ON FUNCTION public.create_renegotiation_agreement(uuid, uuid, uuid[], jsonb, text, text, numeric, numeric, date, numeric, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_renegotiation_agreement(uuid, uuid, uuid[], jsonb, text, text, numeric, numeric, date, numeric, numeric, text) TO service_role;
