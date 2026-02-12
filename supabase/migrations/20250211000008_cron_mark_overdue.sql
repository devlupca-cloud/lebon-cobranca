-- Job diário no backend: executa mark_overdue_installments todo dia às 6h.
-- Obrigatório: habilitar pg_cron antes (Dashboard → Integrations → Cron).
-- Expressão '0 6 * * *' = todo dia às 06:00 (minuto 0, hora 6).

SELECT cron.schedule(
  'mark-overdue-installments',
  '0 6 * * *',
  $$SELECT public.mark_overdue_installments()$$
);
