-- Garante que customer_files e contract_files tenham as colunas esperadas pelo app.
-- Execute no SQL Editor do Supabase se não usar supabase db push.

-- customer_files: file_url, file_name, notes
ALTER TABLE public.customer_files
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.customer_files.file_url IS 'URL do arquivo no Storage (Supabase)';
COMMENT ON COLUMN public.customer_files.file_name IS 'Nome original do arquivo';
COMMENT ON COLUMN public.customer_files.notes IS 'Observações opcionais';

-- contract_files: mesmas colunas se a tabela existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contract_files') THEN
    ALTER TABLE public.contract_files
      ADD COLUMN IF NOT EXISTS file_url text,
      ADD COLUMN IF NOT EXISTS file_name text,
      ADD COLUMN IF NOT EXISTS notes text;
    COMMENT ON COLUMN public.contract_files.file_url IS 'URL do arquivo no Storage (Supabase)';
    COMMENT ON COLUMN public.contract_files.file_name IS 'Nome original do arquivo';
    COMMENT ON COLUMN public.contract_files.notes IS 'Observações opcionais';
  END IF;
END $$;
