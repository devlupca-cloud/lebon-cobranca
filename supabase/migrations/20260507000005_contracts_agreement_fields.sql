-- Adiciona suporte a "acordo" como contrato separado:
--   * agreement_type: 'amigavel' | 'juridico' | NULL (NULL = contrato comum)
--   * process_number: numero do processo judicial (so quando juridico)
--   * original_contract_id: aponta para o contrato antigo que originou este acordo
--   * status_id = 5 (renegotiated): contrato antigo apos acordo
--
-- A logica de criacao do contrato novo + marcacao do antigo fica na RPC
-- `create_renegotiation_agreement` (proxima migration).

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS agreement_type text NULL,
  ADD COLUMN IF NOT EXISTS process_number text NULL,
  ADD COLUMN IF NOT EXISTS original_contract_id uuid NULL;

-- FK para auto-referencia (contrato novo aponta para o antigo).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'contracts_original_contract_id_fkey'
  ) THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_original_contract_id_fkey
      FOREIGN KEY (original_contract_id)
      REFERENCES public.contracts(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Restringe agreement_type a valores validos.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'contracts_agreement_type_check'
  ) THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_agreement_type_check
      CHECK (agreement_type IS NULL OR agreement_type IN ('amigavel', 'juridico'));
  END IF;
END $$;

-- Garante que process_number so e preenchido quando o tipo e juridico.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'contracts_process_number_only_when_juridico'
  ) THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_process_number_only_when_juridico
      CHECK (
        process_number IS NULL
        OR (agreement_type = 'juridico')
      );
  END IF;
END $$;

-- Indice para listar acordos a partir do contrato original.
CREATE INDEX IF NOT EXISTS contracts_original_contract_id_idx
  ON public.contracts(original_contract_id)
  WHERE original_contract_id IS NOT NULL;

-- Indice para filtrar por tipo de acordo.
CREATE INDEX IF NOT EXISTS contracts_agreement_type_idx
  ON public.contracts(agreement_type)
  WHERE agreement_type IS NOT NULL;

-- Status `renegotiated` (id=5) em contract_statuses.
-- Diferente de installment_status.RENEGOTIATED (id=6 nessa outra tabela).
INSERT INTO public.contract_statuses (id, name)
VALUES (5, 'renegotiated')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

COMMENT ON COLUMN public.contracts.agreement_type IS
  'Tipo do acordo: amigavel (entre credor e devedor) ou juridico (judicial). NULL = contrato comum.';
COMMENT ON COLUMN public.contracts.process_number IS
  'Numero do processo judicial — preenchido apenas quando agreement_type=juridico.';
COMMENT ON COLUMN public.contracts.original_contract_id IS
  'Aponta para o contrato antigo que originou este acordo (NULL para contratos comuns).';
