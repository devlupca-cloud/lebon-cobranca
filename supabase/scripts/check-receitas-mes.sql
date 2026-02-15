-- Rode no SQL Editor do Supabase. Retorna por empresa: quantas parcelas vencem este mês e os totais.

WITH contratos_ok AS (
  SELECT c.id, c.company_id
  FROM contracts c
  INNER JOIN customers cust ON cust.id = c.customer_id AND cust.deleted_at IS NULL
  WHERE c.deleted_at IS NULL
),
parcelas_este_mes AS (
  SELECT
    ci.company_id,
    COUNT(*) AS parcelas_que_vencem_este_mes,
    COALESCE(SUM(ci.amount), 0) AS receitas_previstas_total,
    COALESCE(SUM(ci.amount - ci.amount_paid), 0) AS a_receber_este_mes
  FROM contract_installments ci
  INNER JOIN contratos_ok co ON co.id = ci.contract_id AND co.company_id = ci.company_id
  WHERE ci.deleted_at IS NULL
    AND ci.due_date >= date_trunc('month', current_date)::date
    AND ci.due_date < (date_trunc('month', current_date) + interval '1 month')::date
  GROUP BY ci.company_id
)
SELECT
  p.company_id,
  p.parcelas_que_vencem_este_mes,
  p.receitas_previstas_total,
  p.a_receber_este_mes
FROM parcelas_este_mes p
ORDER BY p.company_id;
