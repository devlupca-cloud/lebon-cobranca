-- Coluna fiador em contracts: referência ao cliente cadastrado como fiador.
-- Necessária para a API REST (PostgREST) expor a relação guarantor:customers!guarantor_customer_id.

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS guarantor_customer_id uuid REFERENCES public.customers(id);

COMMENT ON COLUMN public.contracts.guarantor_customer_id IS 'Cliente cadastrado como fiador do contrato (opcional)';
