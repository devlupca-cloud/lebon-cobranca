-- Função para o job diário (pg_cron): marca parcelas vencidas como atrasado (OVERDUE).
-- Só deve ser executada pelo agendamento no backend, não pelo frontend.
-- Status: OPEN=1, PARTIAL=2, PAID=3, OVERDUE=4, CANCELED=5.

CREATE OR REPLACE FUNCTION public.mark_overdue_installments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  WITH updated AS (
    UPDATE public.contract_installments
    SET status_id = 4  -- OVERDUE
    WHERE deleted_at IS NULL
      AND status_id IN (1, 2)   -- OPEN, PARTIAL
      AND due_date < CURRENT_DATE
      AND amount_paid < amount
    RETURNING id
  )
  SELECT COUNT(*)::integer INTO v_updated FROM updated;

  RETURN v_updated;
END;
$$;

COMMENT ON FUNCTION public.mark_overdue_installments IS 'Marca parcelas vencidas e não quitadas como atrasado (OVERDUE). Executada todo dia pelo job pg_cron (backend).';

GRANT EXECUTE ON FUNCTION public.mark_overdue_installments TO service_role;
