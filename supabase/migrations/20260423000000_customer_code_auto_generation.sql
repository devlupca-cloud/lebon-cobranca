-- Geração automática de `customer_code` (e espelho em `system_code`) no formato
-- CLI-NNN (3 dígitos com zero à esquerda, escala automática para 4+ dígitos).
--
-- Requisitos (ver PDF de correções, imagem 10):
--   • Código do Sistema deve ser preenchido automaticamente no cadastro
--   • Formato: 'CLI-' + sequência numérica por company_id
--   • Não editável após criação (aplicado no front; trigger só preenche se vier NULL)
--
-- Estratégia:
--   1. Trigger BEFORE INSERT em customers → atribui próximo número livre da empresa
--   2. Advisory lock por company_id → evita colisão em inserts concorrentes
--   3. Backfill idempotente → preenche clientes antigos sem customer_code e sincroniza
--      system_code com customer_code quando system_code for NULL.

-- ──────────────────────────── Trigger function ─────────────────────────────
CREATE OR REPLACE FUNCTION public.assign_customer_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_next int;
  v_code text;
BEGIN
  -- Quando já veio customer_code preenchido, respeitar o valor enviado.
  IF NEW.customer_code IS NOT NULL AND btrim(NEW.customer_code) <> '' THEN
    -- Ainda assim, preenche system_code se estiver vazio (espelho).
    IF NEW.system_code IS NULL OR btrim(NEW.system_code) = '' THEN
      NEW.system_code := NEW.customer_code;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'customers.company_id é obrigatório para gerar customer_code automático.';
  END IF;

  -- Lock por company_id para evitar race condition em inserts concorrentes.
  PERFORM pg_advisory_xact_lock(hashtext('customers.code:' || NEW.company_id::text));

  -- Maior número sequencial atual no formato CLI-NNN dentro da empresa.
  SELECT COALESCE(
    MAX(
      CASE
        WHEN customer_code ~ '^CLI-[0-9]+$'
        THEN (substring(customer_code FROM '^CLI-([0-9]+)$'))::int
        ELSE 0
      END
    ),
    0
  )
  INTO v_next
  FROM public.customers
  WHERE company_id = NEW.company_id;

  v_next := COALESCE(v_next, 0) + 1;
  v_code := 'CLI-' || LPAD(v_next::text, 3, '0');

  NEW.customer_code := v_code;
  IF NEW.system_code IS NULL OR btrim(NEW.system_code) = '' THEN
    NEW.system_code := v_code;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.assign_customer_code() IS
  'Gera customer_code sequencial por company_id (CLI-NNN) quando NULL. Espelha em system_code.';

-- ──────────────────────────── Trigger ──────────────────────────────────────
DROP TRIGGER IF EXISTS assign_customer_code_trigger ON public.customers;

CREATE TRIGGER assign_customer_code_trigger
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_customer_code();

-- ──────────────────────────── Backfill (idempotente) ──────────────────────
-- Preenche clientes existentes sem customer_code e sincroniza system_code.
DO $$
DECLARE
  comp_id uuid;
  cust_id uuid;
  v_next int;
  v_code text;
BEGIN
  FOR comp_id IN
    SELECT DISTINCT company_id FROM public.customers WHERE company_id IS NOT NULL
  LOOP
    SELECT COALESCE(
      MAX(
        CASE
          WHEN customer_code ~ '^CLI-[0-9]+$'
          THEN (substring(customer_code FROM '^CLI-([0-9]+)$'))::int
          ELSE 0
        END
      ),
      0
    )
    INTO v_next
    FROM public.customers
    WHERE company_id = comp_id;

    -- Atribui código aos sem customer_code, em ordem de criação.
    FOR cust_id IN
      SELECT id
      FROM public.customers
      WHERE company_id = comp_id
        AND (customer_code IS NULL OR btrim(customer_code) = '')
      ORDER BY created_at
    LOOP
      v_next := v_next + 1;
      v_code := 'CLI-' || LPAD(v_next::text, 3, '0');
      UPDATE public.customers
      SET customer_code = v_code,
          system_code = COALESCE(NULLIF(btrim(system_code), ''), v_code),
          updated_at = NOW()
      WHERE id = cust_id;
    END LOOP;

    -- Sincroniza system_code vazio com customer_code existente.
    UPDATE public.customers
    SET system_code = customer_code, updated_at = NOW()
    WHERE company_id = comp_id
      AND (system_code IS NULL OR btrim(system_code) = '')
      AND customer_code IS NOT NULL;
  END LOOP;
END $$;
