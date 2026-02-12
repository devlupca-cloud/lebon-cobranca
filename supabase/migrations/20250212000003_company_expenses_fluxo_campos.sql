-- Campos adicionais do formulário Fluxo de Caixa (FlutterFlow)
ALTER TABLE public.company_expenses
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS payment_date date;

COMMENT ON COLUMN public.company_expenses.title IS 'Título do documento/lançamento';
COMMENT ON COLUMN public.company_expenses.contact_name IS 'Nome do usuário/contato';
COMMENT ON COLUMN public.company_expenses.payment_date IS 'Dia/data de pagamento';
