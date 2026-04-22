-- Recalcula outstanding_balance de TODOS os clientes a partir das parcelas
-- em aberto (OPEN/PARTIAL/OVERDUE) de contratos não deletados.
--
-- Motivo: antes das melhorias do fluxo de contrato (insertContract/activate
-- passaram a atualizar o saldo ao gerar parcelas), alguns clientes ficaram
-- com outstanding_balance "congelado" em valores legados vindos de
-- importações/seeds anteriores. Esta migration reconcilia o dado com a
-- realidade das parcelas.
--
-- Idempotente: rodar de novo produz o mesmo resultado se o estado não mudou.

UPDATE public.customers c
SET outstanding_balance = COALESCE(
      (SELECT SUM(ci.amount - ci.amount_paid)
         FROM public.contract_installments ci
         JOIN public.contracts co
           ON co.id = ci.contract_id
          AND co.deleted_at IS NULL
        WHERE co.customer_id = c.id
          AND co.company_id = c.company_id
          AND ci.status_id IN (1, 2, 4)
          AND ci.deleted_at IS NULL),
      0
    ),
    updated_at = NOW()
WHERE c.deleted_at IS NULL;
