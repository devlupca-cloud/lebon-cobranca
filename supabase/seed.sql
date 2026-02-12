-- Seed: dados fictícios para preencher o banco e ver todas as telas funcionando.
-- Usa o primeiro company_id de company_users (faça login e vincule uma empresa em Cadastrar Acesso antes de rodar).
-- Rodar: supabase db reset (aplica migrations + seed) ou SQL Editor com o conteúdo deste arquivo.

DO $$
DECLARE
  v_company_id uuid;
  v_user_id uuid;
  v_last_month_ts timestamptz;
  v_this_month_ts timestamptz;
  v_addr1 uuid; v_addr2 uuid; v_addr3 uuid; v_addr4 uuid; v_addr5 uuid; v_addr6 uuid; v_addr7 uuid; v_addr8 uuid;
  v_c1 uuid; v_c2 uuid; v_c3 uuid; v_c4 uuid; v_c5 uuid; v_c6 uuid; v_c7 uuid; v_c8 uuid;
  v_contract1 uuid; v_contract2 uuid; v_contract3 uuid; v_contract4 uuid; v_contract5 uuid;
  v_inst1 uuid; v_inst2 uuid; v_inst3 uuid; v_inst4 uuid; v_inst5 uuid;
  v_inst2_1 uuid; v_inst2_2 uuid; v_inst2_3 uuid;
  v_inst3_1 uuid; v_inst3_2 uuid;
  v_inst4_1 uuid; v_inst4_2 uuid; v_inst4_3 uuid; v_inst4_4 uuid;
BEGIN
  SELECT company_id, id INTO v_company_id, v_user_id
  FROM public.company_users
  WHERE is_active = true
  LIMIT 1;

  IF v_company_id IS NULL OR v_user_id IS NULL THEN
    RAISE NOTICE 'Nenhuma empresa encontrada em company_users. Faça login e vincule uma empresa em Cadastrar Acesso, depois rode o seed novamente.';
    RETURN;
  END IF;

  -- Datas para o dashboard mostrar comparação mês anterior vs este mês
  v_last_month_ts := (date_trunc('month', current_date) - interval '1 month') + interval '10 days';
  v_this_month_ts := date_trunc('month', current_date) + interval '5 days';

  RAISE NOTICE 'Inserindo dados fictícios para company_id %', v_company_id;

  -- 0. Endereços (só insere se a tabela addresses existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'addresses') THEN
    INSERT INTO public.addresses (id, company_id, street, number, neighbourhood, city, state, zip_code, additional_info)
    VALUES (gen_random_uuid(), v_company_id, 'Rua das Flores', '100', 'Centro', 'São Paulo', 'SP', '01310100', 'Apto 42')
    RETURNING id INTO v_addr1;
    INSERT INTO public.addresses (id, company_id, street, number, neighbourhood, city, state, zip_code, additional_info)
    VALUES (gen_random_uuid(), v_company_id, 'Av. Brasil', '2500', 'Jardins', 'São Paulo', 'SP', '01430001', NULL)
    RETURNING id INTO v_addr2;
    INSERT INTO public.addresses (id, company_id, street, number, neighbourhood, city, state, zip_code, additional_info)
    VALUES (gen_random_uuid(), v_company_id, 'Rua do Comércio', '77', 'Centro', 'Campinas', 'SP', '13010001', 'Sala 3')
    RETURNING id INTO v_addr3;
    INSERT INTO public.addresses (id, company_id, street, number, neighbourhood, city, state, zip_code, additional_info)
    VALUES (gen_random_uuid(), v_company_id, 'Rua das Palmeiras', '45', 'Vila Nova', 'Guarulhos', 'SP', '07013100', NULL)
    RETURNING id INTO v_addr4;
    INSERT INTO public.addresses (id, company_id, street, number, neighbourhood, city, state, zip_code, additional_info)
    VALUES (gen_random_uuid(), v_company_id, 'Av. Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP', '01310100', 'Conjunto 1201')
    RETURNING id INTO v_addr5;
    INSERT INTO public.addresses (id, company_id, street, number, neighbourhood, city, state, zip_code, additional_info)
    VALUES (gen_random_uuid(), v_company_id, 'Rua Augusta', '500', 'Consolação', 'São Paulo', 'SP', '01305000', NULL)
    RETURNING id INTO v_addr6;
    INSERT INTO public.addresses (id, company_id, street, number, neighbourhood, city, state, zip_code, additional_info)
    VALUES (gen_random_uuid(), v_company_id, 'Rua da Consolação', '200', 'Consolação', 'São Paulo', 'SP', '01301100', NULL)
    RETURNING id INTO v_addr7;
    INSERT INTO public.addresses (id, company_id, street, number, neighbourhood, city, state, zip_code, additional_info)
    VALUES (gen_random_uuid(), v_company_id, 'Av. Rebouças', '3000', 'Pinheiros', 'São Paulo', 'SP', '05401000', NULL)
    RETURNING id INTO v_addr8;
  ELSE
    v_addr1 := NULL; v_addr2 := NULL; v_addr3 := NULL; v_addr4 := NULL;
    v_addr5 := NULL; v_addr6 := NULL; v_addr7 := NULL; v_addr8 := NULL;
  END IF;

  -- 1. Clientes – 4 criados “no mês passado” e 4 “este mês” para o dashboard mostrar % de comparação
  INSERT INTO public.customers (
    id, company_id, person_type, status_id, full_name, cpf, cnpj, legal_name, trade_name, state_registration,
    phone, mobile, email, birth_date, occupation, marital_status_id, customer_code, referral, credit_limit, outstanding_balance,
    address_id, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_company_id, 'fisica', 1, 'Maria Silva Santos', '12345678900', NULL, NULL, NULL, NULL,
    '1133331111', '11987654321', 'maria.silva@email.com', '1985-03-15', 'Comerciante', 2, 'CLI-001', 'Indicação', 5000.00, 5312.50,
    v_addr1, v_last_month_ts, v_last_month_ts
  ) RETURNING id INTO v_c1;

  INSERT INTO public.customers (
    id, company_id, person_type, status_id, full_name, cpf, cnpj, legal_name, trade_name, state_registration,
    phone, mobile, email, birth_date, occupation, marital_status_id, customer_code, referral, credit_limit, outstanding_balance,
    address_id, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_company_id, 'fisica', 1, 'João Carlos Oliveira', '98765432100', NULL, NULL, NULL, NULL,
    '1144442222', '11976543210', 'joao.oliveira@email.com', '1978-07-22', 'Autônomo', 1, 'CLI-002', NULL, 10000.00, 9120.00,
    v_addr2, v_last_month_ts, v_last_month_ts
  ) RETURNING id INTO v_c2;

  INSERT INTO public.customers (
    id, company_id, person_type, status_id, full_name, cpf, cnpj, legal_name, trade_name, state_registration,
    phone, mobile, email, birth_date, occupation, marital_status_id, customer_code, referral, credit_limit, outstanding_balance,
    address_id, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_company_id, 'fisica', 1, 'Ana Paula Costa', '11122233344', NULL, NULL, NULL, NULL,
    NULL, '11965432109', 'ana.costa@email.com', '1990-11-08', 'Empresária', 2, 'CLI-003', 'Site', 3000.00, 4166.65,
    v_addr3, v_last_month_ts, v_last_month_ts
  ) RETURNING id INTO v_c3;

  INSERT INTO public.customers (
    id, company_id, person_type, status_id, full_name, cpf, cnpj, legal_name, trade_name, state_registration,
    phone, mobile, email, birth_date, occupation, marital_status_id, customer_code, referral, credit_limit, outstanding_balance,
    address_id, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_company_id, 'fisica', 1, 'Pedro Henrique Souza', '55566677788', NULL, NULL, NULL, NULL,
    '1155553333', '11954321098', 'pedro.souza@email.com', '1982-01-30', 'Servidor público', 1, 'CLI-004', NULL, 8000.00, 0.00,
    v_addr4, v_last_month_ts, v_last_month_ts
  ) RETURNING id INTO v_c4;

  INSERT INTO public.customers (
    id, company_id, person_type, status_id, full_name, cpf, cnpj, legal_name, trade_name, state_registration,
    phone, mobile, email, birth_date, occupation, marital_status_id, customer_code, referral, credit_limit, outstanding_balance,
    address_id, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_company_id, 'juridica', 1, NULL, NULL, '11222333000181', 'Tech Solutions Tecnologia Ltda', 'Tech Solutions', '123456789',
    '1133334444', NULL, 'contato@techsol.com', NULL, NULL, NULL, 'CLI-005', 'Parceiro', 50000.00, 0.00,
    v_addr5, v_this_month_ts, v_this_month_ts
  ) RETURNING id INTO v_c5;

  INSERT INTO public.customers (
    id, company_id, person_type, status_id, full_name, cpf, cnpj, legal_name, trade_name, state_registration,
    phone, mobile, email, birth_date, occupation, marital_status_id, customer_code, referral, credit_limit, outstanding_balance,
    address_id, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_company_id, 'juridica', 1, NULL, NULL, '33444555000192', 'Comércio de Alimentos ME', 'Mercado do Bairro', NULL,
    '1144445555', '11999998888', 'financeiro@mercadobairro.com', NULL, NULL, NULL, 'CLI-006', NULL, 15000.00, 0.00,
    v_addr6, v_this_month_ts, v_this_month_ts
  ) RETURNING id INTO v_c6;

  INSERT INTO public.customers (
    id, company_id, person_type, status_id, full_name, cpf, cnpj, legal_name, trade_name, state_registration,
    phone, mobile, email, birth_date, occupation, marital_status_id, customer_code, referral, credit_limit, outstanding_balance,
    address_id, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_company_id, 'fisica', 1, 'Fernanda Lima Rocha', '77788899900', NULL, NULL, NULL, NULL,
    '1166667777', '11988887777', 'fernanda.rocha@email.com', '1995-05-12', 'Advogada', 1, 'CLI-007', 'Indicação', 7000.00, 0.00,
    v_addr7, v_this_month_ts, v_this_month_ts
  ) RETURNING id INTO v_c7;

  INSERT INTO public.customers (
    id, company_id, person_type, status_id, full_name, cpf, cnpj, legal_name, trade_name, state_registration,
    phone, mobile, email, birth_date, occupation, marital_status_id, customer_code, referral, credit_limit, outstanding_balance,
    address_id, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_company_id, 'fisica', 2, 'Roberto Alves', '22233344455', NULL, NULL, NULL, NULL,
    '1177778888', NULL, 'roberto.alves@email.com', '1970-12-01', 'Aposentado', 4, 'CLI-008', NULL, 2000.00, 0.00,
    v_addr8, v_this_month_ts, v_this_month_ts
  ) RETURNING id INTO v_c8;

  -- 2. Contratos – 2 “mês passado” e 3 “este mês” para o dashboard mostrar % (Total de Clientes, Contratos Ativos, Valor Total, Novos Este Mês)
  INSERT INTO public.contracts (
    id, company_id, customer_id, contract_number, inclusion_date, contract_amount, installments_count,
    installment_amount, total_amount, first_due_date, contract_category_id, contract_type_id, status_id, notes,
    created_at, updated_at, total_installments, residual_amount, bank
  ) VALUES (
    gen_random_uuid(), v_company_id, v_c1, '5001234-56.2023.8.02.0001', '2023-05-15', 8500.00, 8,
    1062.50, 8500.00, '2023-06-10', 1, 1, 2, 'Confissão de dívida – acordo judicial.',
    v_last_month_ts, v_last_month_ts, 8, 5312.50, 'Itaú'
  ) RETURNING id INTO v_contract1;

  INSERT INTO public.contracts (
    id, company_id, customer_id, contract_number, inclusion_date, contract_amount, installments_count,
    installment_amount, total_amount, first_due_date, contract_category_id, contract_type_id, status_id, notes,
    created_at, updated_at, total_installments, residual_amount, bank
  ) VALUES (
    gen_random_uuid(), v_company_id, v_c2, '5001234-57.2023.8.02.0001', '2023-04-20', 15200.00, 10,
    1520.00, 15200.00, '2023-05-15', 1, 1, 2, 'Contrato João – parcelas em atraso.',
    v_last_month_ts, v_last_month_ts, 10, 9120.00, 'Bradesco'
  ) RETURNING id INTO v_contract2;

  INSERT INTO public.contracts (
    id, company_id, customer_id, contract_number, inclusion_date, contract_amount, installments_count,
    installment_amount, total_amount, first_due_date, contract_category_id, contract_type_id, status_id, notes,
    created_at, updated_at, total_installments, residual_amount, bank
  ) VALUES (
    gen_random_uuid(), v_company_id, v_c3, '5001234-58.2023.8.02.0001', '2024-09-01', 5000.00, 6,
    833.33, 5000.00, '2024-10-01', 1, 1, 2, NULL,
    v_this_month_ts, v_this_month_ts, 6, 4166.65, NULL
  ) RETURNING id INTO v_contract3;

  INSERT INTO public.contracts (
    id, company_id, customer_id, contract_number, inclusion_date, contract_amount, installments_count,
    installment_amount, total_amount, first_due_date, contract_category_id, contract_type_id, status_id, notes,
    created_at, updated_at, total_installments, residual_amount, bank
  ) VALUES (
    gen_random_uuid(), v_company_id, v_c4, '5001234-59.2023.8.02.0001', '2022-12-28', 2000.00, 4,
    500.00, 2000.00, '2023-01-10', 1, 1, 3, 'Quitado em dia.',
    v_this_month_ts, v_this_month_ts, 4, 0.00, 'Santander'
  ) RETURNING id INTO v_contract4;

  INSERT INTO public.contracts (
    id, company_id, customer_id, contract_number, inclusion_date, contract_amount, installments_count,
    installment_amount, total_amount, first_due_date, contract_category_id, contract_type_id, status_id, notes,
    created_at, updated_at, total_installments, residual_amount, bank
  ) VALUES (
    gen_random_uuid(), v_company_id, v_c6, '5001234-60.2024.8.02.0001', '2024-11-10', 12000.00, 12,
    1000.00, 12000.00, '2024-12-10', 1, 1, 2, 'Mercado do Bairro – financiamento.',
    v_this_month_ts, v_this_month_ts, 12, 12000.00, 'Caixa'
  ) RETURNING id INTO v_contract5;

  -- 3. Parcelas – Contrato 1 (Maria)
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract1, v_company_id, 1, '2023-06-10', 1062.50, 1062.50, '2023-06-15', 3, 1) RETURNING id INTO v_inst1;
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract1, v_company_id, 2, '2023-07-10', 1062.50, 1062.50, '2023-07-13', 3, 1) RETURNING id INTO v_inst2;
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract1, v_company_id, 3, '2023-08-10', 1062.50, 1062.50, '2023-08-18', 3, 1) RETURNING id INTO v_inst3;
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract1, v_company_id, 4, '2023-09-10', 1062.50, 1062.50, '2023-09-15', 3, 1) RETURNING id INTO v_inst4;
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract1, v_company_id, 5, '2023-10-10', 1062.50, 0, NULL, 4, 1) RETURNING id INTO v_inst5;
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract1, v_company_id, 6, '2023-11-10', 1062.50, 0, NULL, 4, 1);
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract1, v_company_id, 7, '2023-12-10', 1062.50, 0, NULL, 4, 1);
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract1, v_company_id, 8, '2024-01-10', 1062.50, 0, NULL, 4, 1);

  -- Parcelas – Contrato 2 (João)
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract2, v_company_id, 1, '2023-05-15', 1520.00, 1520.00, '2023-05-18', 3, 1) RETURNING id INTO v_inst2_1;
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract2, v_company_id, 2, '2023-06-15', 1520.00, 1520.00, '2023-06-18', 3, 1) RETURNING id INTO v_inst2_2;
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract2, v_company_id, 3, '2023-07-15', 1520.00, 1520.00, '2023-07-18', 3, 1) RETURNING id INTO v_inst2_3;
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract2, v_company_id, 4, '2023-08-15', 1520.00, 1520.00, '2023-08-18', 3, 1);
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract2, v_company_id, 5, '2023-09-15', 1520.00, 0, NULL, 4, 1);
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract2, v_company_id, 6, '2023-10-15', 1520.00, 0, NULL, 4, 1);
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract2, v_company_id, 7, '2023-11-15', 1520.00, 0, NULL, 4, 1);
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract2, v_company_id, 8, '2023-12-15', 1520.00, 0, NULL, 4, 1);
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract2, v_company_id, 9, '2024-01-15', 1520.00, 0, NULL, 4, 1);
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract2, v_company_id, 10, '2024-02-15', 1520.00, 0, NULL, 4, 1);

  -- Parcelas – Contrato 3 (Ana)
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract3, v_company_id, 1, '2024-10-01', 833.33, 833.33, '2024-10-02', 3, 1) RETURNING id INTO v_inst3_1;
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract3, v_company_id, 2, '2024-11-01', 833.33, 0, NULL, 4, 1) RETURNING id INTO v_inst3_2;
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract3, v_company_id, 3, '2024-12-01', 833.33, 0, NULL, 1, 1);
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract3, v_company_id, 4, '2025-01-01', 833.33, 0, NULL, 1, 1);
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract3, v_company_id, 5, '2025-02-01', 833.33, 0, NULL, 1, 1);
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract3, v_company_id, 6, '2025-03-01', 833.34, 0, NULL, 1, 1);

  -- Parcelas – Contrato 4 (Pedro – fechado)
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract4, v_company_id, 1, '2023-01-10', 500.00, 500.00, '2023-01-12', 3, 1) RETURNING id INTO v_inst4_1;
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract4, v_company_id, 2, '2023-02-10', 500.00, 500.00, '2023-02-12', 3, 1) RETURNING id INTO v_inst4_2;
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract4, v_company_id, 3, '2023-03-10', 500.00, 500.00, '2023-03-12', 3, 1) RETURNING id INTO v_inst4_3;
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract4, v_company_id, 4, '2023-04-10', 500.00, 500.00, '2023-04-12', 3, 1) RETURNING id INTO v_inst4_4;

  -- Parcelas – Contrato 5 (Mercado do Bairro – 12 parcelas futuras, nenhuma paga)
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract5, v_company_id, 1, '2024-12-10', 1000.00, 0, NULL, 1, 1);
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract5, v_company_id, 2, '2025-01-10', 1000.00, 0, NULL, 1, 1);
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract5, v_company_id, 3, '2025-02-10', 1000.00, 0, NULL, 1, 1);
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract5, v_company_id, 4, '2025-03-10', 1000.00, 0, NULL, 1, 1);
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract5, v_company_id, 5, '2025-04-10', 1000.00, 0, NULL, 1, 1);
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract5, v_company_id, 6, '2025-05-10', 1000.00, 0, NULL, 1, 1);
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract5, v_company_id, 7, '2025-06-10', 1000.00, 0, NULL, 1, 1);
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract5, v_company_id, 8, '2025-07-10', 1000.00, 0, NULL, 1, 1);
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract5, v_company_id, 9, '2025-08-10', 1000.00, 0, NULL, 1, 1);
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract5, v_company_id, 10, '2025-09-10', 1000.00, 0, NULL, 1, 1);
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract5, v_company_id, 11, '2025-10-10', 1000.00, 0, NULL, 1, 1);
  INSERT INTO public.contract_installments (id, contract_id, company_id, installment_number, due_date, amount, amount_paid, paid_at, status_id, origin_id)
  VALUES (gen_random_uuid(), v_contract5, v_company_id, 12, '2025-11-10', 1000.00, 0, NULL, 1, 1);

  -- 4. Pagamentos (installment_payments)
  INSERT INTO public.installment_payments (company_id, installment_id, paid_amount, paid_at, payment_method_id, received_by_user_id)
  SELECT v_company_id, id, amount_paid, (due_date::date + interval '5 days')::date, 2, v_user_id
  FROM public.contract_installments
  WHERE contract_id = v_contract1 AND amount_paid > 0;
  INSERT INTO public.installment_payments (company_id, installment_id, paid_amount, paid_at, payment_method_id, received_by_user_id)
  SELECT v_company_id, id, amount_paid, (due_date::date + interval '3 days')::date, 1, v_user_id
  FROM public.contract_installments
  WHERE contract_id = v_contract2 AND amount_paid > 0;
  INSERT INTO public.installment_payments (company_id, installment_id, paid_amount, paid_at, payment_method_id, received_by_user_id)
  SELECT v_company_id, id, amount_paid, (due_date::date + interval '1 day')::date, 2, v_user_id
  FROM public.contract_installments
  WHERE contract_id = v_contract3 AND amount_paid > 0;
  INSERT INTO public.installment_payments (company_id, installment_id, paid_amount, paid_at, payment_method_id, received_by_user_id)
  SELECT v_company_id, id, amount_paid, (due_date::date + interval '2 days')::date, 1, v_user_id
  FROM public.contract_installments
  WHERE contract_id = v_contract4 AND amount_paid > 0;

  -- 5. Contas a pagar (company_expenses) – vários tipos e campos do fluxo de caixa
  INSERT INTO public.company_expenses (company_id, payee_name, amount, due_date, expense_type, notes, title, contact_name, payment_date, updated_at)
  VALUES
    (v_company_id, 'Aluguel Comercial', 3500.00, (current_date + interval '10 days')::date, 'Aluguel', 'Aluguel mensal sede', 'Aluguel Jan', 'Imobiliária XYZ', (current_date + interval '12 days')::date, now()),
    (v_company_id, 'Energia Elétrica', 850.00, (current_date + interval '15 days')::date, 'Energia', NULL, 'Conta de luz', 'CPFL', (current_date + interval '16 days')::date, now()),
    (v_company_id, 'Internet e Telefonia', 320.00, (current_date + interval '5 days')::date, 'Internet', 'Plano empresarial', 'Internet', 'Claro', (current_date + interval '6 days')::date, now()),
    (v_company_id, 'Material de Escritório', 450.00, (current_date + interval '20 days')::date, 'Outros', 'Papel e toners', 'Material', NULL, NULL, now()),
    (v_company_id, 'Água e Esgoto', 280.00, (current_date + interval '8 days')::date, 'Água', 'Conta mensal', 'Água', 'SABESP', (current_date + interval '9 days')::date, now()),
    (v_company_id, 'Software e Licenças', 1200.00, (current_date + interval '25 days')::date, 'Outros', 'Anuidade', 'Licenças', 'Fornecedor TI', (current_date + interval '25 days')::date, now()),
    (v_company_id, 'Consultoria Jurídica', 2500.00, (current_date + interval '30 days')::date, 'Outros', 'Prestação de serviço', 'Consultoria', 'Dr. Silva', NULL, now());

  RAISE NOTICE 'Seed concluído: 8 endereços, 8 clientes (PF/PJ, códigos, status), 5 contratos (1 com fiador), parcelas, pagamentos, 7 despesas.';
END $$;
