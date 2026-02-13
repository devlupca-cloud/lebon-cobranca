-- RPC: retorna todas as estatísticas do dashboard em uma única chamada.
-- Evita ~12 requests separados ao abrir a home.

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_this_month date;
  v_last_month date;
  v_total_customers bigint;
  v_total_customers_prev bigint;
  v_total_receivable numeric;
  v_active_contracts bigint;
  v_active_contracts_prev bigint;
  v_new_this_month bigint;
  v_new_prev_month bigint;
  v_total_value_prev numeric;
  v_customers_pct numeric;
  v_active_pct numeric;
  v_value_pct numeric;
  v_new_pct numeric;
BEGIN
  v_this_month := date_trunc('month', CURRENT_DATE)::date;
  v_last_month := date_trunc('month', CURRENT_DATE - interval '1 month')::date;

  -- Clientes atuais (não excluídos)
  SELECT COUNT(*) INTO v_total_customers
  FROM customers
  WHERE company_id = p_company_id AND deleted_at IS NULL;

  -- Clientes criados antes do mês atual
  SELECT COUNT(*) INTO v_total_customers_prev
  FROM customers
  WHERE company_id = p_company_id AND deleted_at IS NULL AND created_at::date < v_this_month;

  -- Total a receber (soma amount das parcelas de contratos com cliente ativo)
  SELECT COALESCE(SUM(ci.amount), 0) INTO v_total_receivable
  FROM contract_installments ci
  JOIN contracts c ON c.id = ci.contract_id AND c.company_id = p_company_id AND c.deleted_at IS NULL
  JOIN customers cust ON cust.id = c.customer_id AND cust.deleted_at IS NULL
  WHERE ci.company_id = p_company_id AND ci.deleted_at IS NULL;

  -- Contratos ativos (status_id = 2) com cliente ativo
  SELECT COUNT(*) INTO v_active_contracts
  FROM contracts c
  JOIN customers cust ON cust.id = c.customer_id AND cust.deleted_at IS NULL
  WHERE c.company_id = p_company_id AND c.deleted_at IS NULL AND c.status_id = 2;

  -- Contratos ativos criados antes do mês atual
  SELECT COUNT(*) INTO v_active_contracts_prev
  FROM contracts c
  JOIN customers cust ON cust.id = c.customer_id AND cust.deleted_at IS NULL
  WHERE c.company_id = p_company_id AND c.deleted_at IS NULL AND c.status_id = 2
    AND c.created_at::date < v_this_month;

  -- Novos contratos este mês (qualquer status, cliente ativo)
  SELECT COUNT(*) INTO v_new_this_month
  FROM contracts c
  JOIN customers cust ON cust.id = c.customer_id AND cust.deleted_at IS NULL
  WHERE c.company_id = p_company_id AND c.deleted_at IS NULL
    AND c.created_at::date >= v_this_month;

  -- Novos contratos mês passado
  SELECT COUNT(*) INTO v_new_prev_month
  FROM contracts c
  JOIN customers cust ON cust.id = c.customer_id AND cust.deleted_at IS NULL
  WHERE c.company_id = p_company_id AND c.deleted_at IS NULL
    AND c.created_at::date >= v_last_month AND c.created_at::date < v_this_month;

  -- Total a receber (soma parcelas) dos contratos criados antes do mês atual
  SELECT COALESCE(SUM(ci.amount), 0) INTO v_total_value_prev
  FROM contract_installments ci
  JOIN contracts c ON c.id = ci.contract_id AND c.company_id = p_company_id AND c.deleted_at IS NULL
    AND c.created_at::date < v_this_month
  JOIN customers cust ON cust.id = c.customer_id AND cust.deleted_at IS NULL
  WHERE ci.company_id = p_company_id AND ci.deleted_at IS NULL;

  -- Percentuais
  v_customers_pct := CASE WHEN v_total_customers_prev > 0
    THEN ((v_total_customers - v_total_customers_prev)::numeric / v_total_customers_prev * 100) ELSE NULL END;
  v_active_pct := CASE WHEN v_active_contracts_prev > 0
    THEN ((v_active_contracts - v_active_contracts_prev)::numeric / v_active_contracts_prev * 100) ELSE NULL END;
  v_value_pct := CASE WHEN v_total_value_prev > 0
    THEN ((v_total_receivable - v_total_value_prev) / v_total_value_prev * 100) ELSE NULL END;
  v_new_pct := CASE WHEN v_new_prev_month > 0
    THEN ((v_new_this_month - v_new_prev_month)::numeric / v_new_prev_month * 100) ELSE NULL END;

  RETURN jsonb_build_object(
    'totalCustomers', COALESCE(v_total_customers, 0),
    'activeContracts', COALESCE(v_active_contracts, 0),
    'totalValue', COALESCE(v_total_receivable, 0),
    'newThisMonth', COALESCE(v_new_this_month, 0),
    'customersChangePercent', v_customers_pct,
    'activeContractsChangePercent', v_active_pct,
    'totalValueChangePercent', v_value_pct,
    'newThisMonthChangePercent', v_new_pct
  );
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_stats IS 'Retorna KPIs do dashboard em uma única chamada: clientes, contratos ativos, valor total, novos no mês e percentuais de variação.';

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid) TO service_role;
