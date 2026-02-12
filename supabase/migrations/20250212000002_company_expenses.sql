-- Contas a pagar: despesas da empresa (Aluguel, etc.)
CREATE TABLE IF NOT EXISTS public.company_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  payee_name text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  due_date date NOT NULL,
  expense_type text NOT NULL DEFAULT 'Outros',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_company_expenses_company_id ON public.company_expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_company_expenses_due_date ON public.company_expenses(due_date);
CREATE INDEX IF NOT EXISTS idx_company_expenses_deleted_at ON public.company_expenses(deleted_at);

ALTER TABLE public.company_expenses ENABLE ROW LEVEL SECURITY;

-- Acesso por empresa (usa função que evita recursão em company_users)
DROP POLICY IF EXISTS "company_access" ON public.company_expenses;
CREATE POLICY "company_access" ON public.company_expenses
  FOR ALL
  USING (company_id IN (SELECT get_company_ids_for_current_user()))
  WITH CHECK (company_id IN (SELECT get_company_ids_for_current_user()));

COMMENT ON TABLE public.company_expenses IS 'Contas a pagar (fluxo de caixa - despesas).';
