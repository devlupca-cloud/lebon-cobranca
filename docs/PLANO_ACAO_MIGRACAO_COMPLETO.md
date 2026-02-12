# Plano de ação – Migração completa Flutter → React (Lebon Cobranças)

Documento de **varredura detalhada** e **plano de ação** para trazer para o React **tudo** que existe no Flutter.  
**Momento crítico:** paridade total de funcionalidade é o objetivo.

---

## Parte 1 – Inventário detalhado por tela (Flutter)

### 1.1 Auth
| Item | Flutter | Observação |
|------|--------|------------|
| Login | `/login` – email/senha, Supabase Auth | ✅ React: implementado |
| Cadastre-se | `/cadastreSe` – signUp Supabase | ✅ React: implementado |
| Logout | Botão "Sair" no header, limpa `infoUser` | ✅ React: implementado |

---

### 1.2 Home (Dashboard)
| Item | Flutter | React |
|------|--------|-------|
| Título | "Dashboard" + subtítulo | ✅ Igual |
| Cards | Total de Clientes, Contratos, Inadimplentes, Valor a receber | ✅ Implementado |
| Dados | Estáticos ou de API (FFAppState / futuros RPCs) | ✅ React: `reports.ts` (getDashboardStats, totais, % mês anterior) |
| Navegação | Links para Clientes, Cadastrar Cliente, Extrato, Contratos, Novo Contrato, Inadimplentes | ✅ React: links na home |

---

### 1.3 Clientes
| Item | Flutter | React |
|------|--------|-------|
| Fonte de dados | RPC `get_customers` (p_company_id, p_limit, p_offset, p_name, p_cpf, p_cnpj, p_status_id) | ✅ `getCustomers()` em `customers.ts` com mesmos parâmetros |
| Filtros | Nome, CPF, CNPJ, Status (dropdown) | ✅ Nome, CPF, CNPJ, Status |
| Ações header | "Novo Cliente", "Voltar" | ✅ Novo Cliente, Voltar (link home) |
| Tabela | Colunas: cliente (código/nome), tipo PF/PJ, documento, cidade, contato, valor, ações | ✅ Listagem com colunas equivalentes + ações |
| Ações por linha | Editar, Ver detalhes, Excluir (?) | ✅ Ver detalhes (modal), Editar (link), Excluir |
| Modal detalhes | PopupDetalhesCliente | ✅ PopupDetalhesCliente |
| Navegação | CadastrarCliente (addEdit=1) | ✅ `/cadastrar-cliente`, `/editar-cliente/[id]`, `/detalhes-clientes/[id]` |

**Gap:** Garantir que todos os campos exibidos no Flutter (código, tipo, documento, cidade, contato, valor) existam e que o modal tenha os mesmos dados e ações (Importar/Adicionar/Excluir contratos, se houver no Flutter).

---

### 1.4 Cadastrar Cliente / Editar Cliente
| Item | Flutter | React |
|------|--------|-------|
| Rota | `/cadastrarCliente` (query addEdit) | ✅ `/cadastrar-cliente`, `/editar-cliente/[id]` |
| Campos (Flutter) | Muitos: tipo PF/PJ, nome/razão, CPF/CNPJ, contatos (Fone, Cel, Com), endereço (CEP, logradouro, número, complemento, bairro, cidade, UF), status, observações, upload de arquivos | ✅ `cliente-form.tsx`: PF/PJ, nome, documento, telefones, CEP (ViaCEP), endereço, status. |
| ViaCEP | Busca CEP | ✅ `viacep.ts` |
| Persistência | Insert/update em `customers` (+ `addresses`?) | ✅ Insert/update em `customers`; endereço em `addresses` se existir tabela |
| Upload Storage | Fotos/documentos em Storage (bucket) | ⚠️ **FALTA:** upload de arquivos em Cadastrar Cliente |

**Gap:** Upload de arquivos (Storage) no cadastro/edição de cliente; conferir se todos os campos do form Flutter estão no React (ex.: "Com" para comercial, múltiplos anexos).

---

### 1.5 Contratos (lista)
| Item | Flutter | React |
|------|--------|-------|
| Fonte de dados | **No código Flutter:** `CustomersTable().queryRows()` (lista **clientes**, não contratos) – possível bug no Flutter | ✅ React: `getContractsFiltered()` – lista **contratos** com filtros |
| Filtros Flutter | 3 campos texto (provavelmente número contrato, cliente, etc.) | ✅ React: número, status, datas, cliente (autocomplete) |
| Ações header | Novo Contrato, Voltar | ✅ Novo Contrato, Voltar |
| Tabela | Colunas (no Flutter mostram clientes por bug) | ✅ React: contrato, cliente, valor, parcelas, vencimento, status, ações |
| Ações por linha | Ver detalhes, Gerar PDF, Quitação, Parcelas (popups) | ✅ Links detalhes/editar + PopupGerarPdf, PopupQuitacao, PopupParcelacliente |

**Gap:** Nenhum crítico. Flutter pode estar exibindo clientes por engano; React está correto com contratos.

---

### 1.6 Novo Contrato
| Item | Flutter | React |
|------|--------|-------|
| Cliente | Autocomplete via RPC `get_customers_autocomplete` (p_company_id, p_search) | ✅ `getCustomersAutocomplete()` |
| Campos | Valores, datas, parcelas, banco, notas, etc. | ✅ `contrato-form.tsx` + página novo-contrato |
| Persistência | Insert em `contracts` (+ parcelas em `contract_installments`?) | ✅ Inserção contrato + parcelas |
| Navegação | Cadastrar Cliente (se precisar criar cliente) | ✅ Link para cadastrar cliente |

**Gap:** Conferir paridade de campos (valor total, número de parcelas, primeiro vencimento, banco, notas, status) entre Flutter e React.

---

### 1.7 Detalhes Contrato / Editar Contrato
| Item | Flutter | React |
|------|--------|-------|
| Tela dedicada | Não existe rota própria; "Detalhes do Contrato" aparece em popup (PopupGerarPdf) | ✅ React: `/detalhes-contrato/[id]`, `/editar-contrato/[id]` (telas completas) |
| Conteúdo | Modal com dados do contrato | ✅ Páginas com dados do contrato, parcelas, ações |

**React está à frente:** tem telas de detalhes e edição de contrato que o Flutter não tem como rota.

---

### 1.8 Inadimplentes
| Item | Flutter | React |
|------|--------|-------|
| Layout | Card em gradiente vermelho com totais; filtro de busca; tabela de parcelas vencidas | ✅ Card total em atraso, contagem +90 dias, tabela |
| Dados | Parcelas vencidas não pagas (provavelmente RPC ou query em contract_installments) | ✅ `getOverdueInstallments()` em `installments.ts` |
| Colunas | Cliente, contrato, parcela, vencimento, dias em atraso, valor em aberto | ✅ Equivalentes |
| Popups | Gerar PDF, Novo Contrato, link Inadimplentes (no popup parcelas) | ✅ Integração com popups |

**Gap:** Garantir que totais (+90 dias) e filtros (se houver no Flutter) estejam iguais.

---

### 1.9 Fluxo de Caixa (Contas a pagar)
| Item | Flutter | React |
|------|--------|-------|
| Lista | FluxoCaixaWidget: dropdowns "Por tipo" / "Por Data" (valores fixos: Janeiro, Fevereiro…), botão "Relatórios"; tabela com Nome de Empresa, Valor (dados estáticos no Flutter) | ✅ React: lista real de `company_expenses` (getExpensesByCompany), link Cadastrar, editar/detalhe por ID |
| Cadastrar | CadastrarFluxoDeCaixaWidget: 7 campos – Nome do Usuario (textController2), Titulo (3), Descrição (4), Valor (5), Data Vencimento (6), Dia Pagamento (7), Empresa (1?) + "Salvar Documento" | ✅ React: empresa, nome, título, descrição, valor, data vencimento, dia pagamento, Salvar |
| Persistência | Não fica explícito no Flutter (pode ser company_expenses) | ✅ Insert/update em `company_expenses` |
| Edição | Flutter não mostra rota de edição; lista parece estática | ✅ React: `/fluxo-caixa/editar/[id]` |

**Gap:** Flutter lista parece mock (dropdowns estáticos, tabela exemplo). React já está com dados reais. Se no Flutter existir integração real com backend, replicar filtros "por tipo" / "por data" no React.

---

### 1.10 Extrato Financeiro
| Item | Flutter | React |
|------|--------|-------|
| Conteúdo | Resumo financeiro (totais, recebido, inadimplente, etc.) | ✅ `getFinancialSummary()`: total a receber, total recebido, inadimplente, contratos ativos/encerrados |
| Layout | Cards/tabelas | ✅ Cards com os 4 indicadores |

**Gap:** Se no Flutter houver filtros por período ou mais métricas, adicionar no React.

---

### 1.11 Simulação
| Item | Flutter | React |
|------|--------|-------|
| Campos | 7 text controllers (valor, taxa, parcelas, etc.) | ✅ Tela com campos de simulação |
| Cálculo | PMT (parcela) e totais | ✅ Cálculo PMT / simulação |
| Botão | "Novo Contrato" ao final | ✅ Pode ter link para novo contrato |

**Gap:** Conferir se os 7 campos e fórmulas são idênticos (valor principal, taxa, número de parcelas, valor por parcela, total, etc.).

---

### 1.12 Gerar Documentos
| Item | Flutter | React |
|------|--------|-------|
| Tela | Dropdowns, opções, botão Voltar | ✅ Tela básica com estrutura |
| Geração real | PopupGerarPdf: "Detalhes do Contrato"; integração com geração de PDF não clara | ⚠️ **FALTA:** integração real com backend/RPC para gerar PDF |

**Gap:** Definir e implementar fluxo de geração de PDF (RPC ou serviço) e expor na tela + no popup.

---

### 1.13 Cadastrar Acesso
| Item | Flutter | React |
|------|--------|-------|
| Conteúdo | Gestão de usuários da empresa (company_users) | ✅ Lista `getCompanyUsers`, criar usuário com senha temporária, editar, desativar |
| Ações | Adicionar usuário, editar, remover acesso | ✅ Criar, editar, remover acesso |

**Gap:** Mínimo; conferir se campos (nome, email, role) e fluxo de senha temporária estão iguais.

---

### 1.14 Perfil (Profile06)
| Item | Flutter | React |
|------|--------|-------|
| Foto | Upload em Storage (bucket `photo_user`) | ✅ Upload de foto (Storage) |
| Dados | Nome, email, etc. | ✅ Perfil com dados do usuário |

**Gap:** Garantir mesmo bucket e mesmo comportamento (atualização de nome/email se houver no Flutter).

---

### 1.15 Base de Cálculo
| Item | Flutter | React |
|------|--------|-------|
| Título | "Novo Contrato de base de calculo" | — |
| Conteúdo | **15 campos:** Cliente (dropdown "Selecionar Cliente"), Dados do Contrato (Cheque / Nota Promissória), Fone, Cel, Com, CPF, Banco, Base de Calculo (código LCMO…), Valor, Taxa, Primeiro Vencimento, Parcelas, Taxa de Juros (%), Valor total, Valor por parcela, Custodia, Valor. Botões Cancelar e "Salvar Contrato". | ❌ React: **placeholder** "Em construção" |

**Gap:** **Migrar tela inteira:** formulário com os 15 campos, dropdown cliente, radio Cheque/Nota Promissória, máscaras (CPF, valores), botões Cancelar e Salvar. Definir se "Salvar Contrato" persiste em `contracts` ou em outra tabela.

---

### 1.16 Cadastro Geral
| Item | Flutter | React |
|------|--------|-------|
| Conteúdo | Título "Cadastro Geral"; **18 text controllers** (formulário grande com muitos campos) | ❌ React: **placeholder** "Em construção" |

**Gap:** **Migrar tela inteira:** extrair do Flutter os rótulos de cada um dos 18 campos e a ação de salvar (qual tabela/RPC usar). Pode ser cadastro de parâmetros gerais da empresa ou múltiplas entidades em uma tela.

---

### 1.17 Financiamento
| Item | Flutter | React |
|------|--------|-------|
| Conteúdo | **16 campos** (textController1…16) – formulário de financiamento | ❌ React: **placeholder** "Em construção" |

**Gap:** **Migrar tela inteira:** mapear os 16 campos no Flutter (rótulos e tipos), reproduzir layout e lógica (cálculos, persistência se houver).

---

### 1.18 Empréstimos
| Item | Flutter | React |
|------|--------|-------|
| Conteúdo | **13 campos** (textController1…13) – formulário de empréstimos | ❌ React: **placeholder** "Em construção" |

**Gap:** **Migrar tela inteira:** mapear os 13 campos, layout e regras (salvar em qual tabela, se houver).

---

### 1.19 Xeque Financiamento
| Item | Flutter | React |
|------|--------|-------|
| Rota | `/xeque/financeiro` | ✅ `/xeque-financiamento` (placeholder) |
| Conteúdo | Formulário específico de "xeque financiamento" | ❌ React: **placeholder** "Em construção" |

**Gap:** **Migrar tela inteira:** analisar widget Flutter (campos, botões, persistência) e replicar no React.

---

### 1.20 Detalhes Clientes (página)
| Item | Flutter | React |
|------|--------|-------|
| Rota | `/detalhesClientes` (sem ID na rota; dados iniciais fixos: CLI001, CPF, João Silva…) | ✅ `/detalhes-clientes/[id]` com dados reais do cliente |
| Conteúdo | Dados do cliente editáveis; Importar/Adicionar/Excluir contratos | ✅ Página com dados do cliente; links para contratos |

**Gap:** Flutter parece estático; React já usa ID e API. Garantir que "Importar/Adicionar/Excluir contratos" exista no React se for requisito.

---

### 1.21 Popups / Modais (Flutter)
| Popup | Flutter | React |
|-------|--------|-------|
| PopupDetalhesCliente | Dados do cliente em modal | ✅ `popup-detalhes-cliente.tsx` |
| PopupGerarPdf | "Detalhes do Contrato", geração PDF | ✅ Estrutura; **falta** integração real PDF |
| PopupQuitacao | Quitação, visualizador/link PDF | ✅ Estrutura; **falta** link/visualizador real |
| PopUpParcelacliente | Parcelas do contrato; links Gerar Documentos, Novo Contrato, Inadimplentes | ✅ `popup-parcelacliente.tsx` com parcelas reais |
| PopUpSimulacao | Cálculo PMT, valor parcela/total | ✅ `popup-simulacao.tsx` |
| ModalConfirm / ModalInfo | Confirmação e mensagem | ✅ Componente Modal no React |

**Gaps:** Gerar PDF e Quitação: implementar chamada ao backend e exibição/link do documento.

---

### 1.22 APIs / Backend (Flutter)
| Chamada | Uso Flutter | React |
|---------|-------------|-------|
| RPC `get_customers` | Lista clientes (ClientesWidget) | ✅ `getCustomers()` |
| RPC `get_customers_autocomplete` | Novo Contrato (autocomplete) | ✅ `getCustomersAutocomplete()` |
| ViaCEP | Cadastrar Cliente (busca endereço) | ✅ `viacep.ts` |
| Tabelas Supabase | customers, contracts, addresses, company_users, contract_installments, installment_payments, etc. | ✅ Uso via `lib/supabase/*.ts` |
| Storage | Upload foto perfil, possivelmente arquivos cliente | ✅ Storage; **falta** upload em Cadastrar Cliente |

---

## Parte 2 – Resumo de gaps (o que falta no React)

### Crítico (telas inteiras só placeholder)
1. **Base de Cálculo** – Formulário com 15+ campos (cliente, tipo contrato, fone, cel, CPF, banco, base, valor, taxa, vencimento, parcelas, juros, totais, custódia). Ação: Salvar Contrato.
2. **Cadastro Geral** – Formulário com 18 campos; definir entidade e persistência.
3. **Financiamento** – Formulário com 16 campos; definir persistência.
4. **Empréstimos** – Formulário com 13 campos; definir persistência.
5. **Xeque Financiamento** – Tela específica; mapear campos e fluxo.

### Importante (funcionalidade parcial)
6. **Gerar Documentos** – Integração real com geração de PDF (RPC ou serviço).
7. **Popup Gerar PDF / Quitação** – Link ou visualizador do documento gerado.
8. **Cadastrar Cliente** – Upload de arquivos (Storage) para documentos do cliente.

### Melhorias / conferência
9. **Simulação** – Paridade exata dos 7 campos e fórmulas com o Flutter.
10. **Fluxo de Caixa (lista)** – Se no Flutter houver filtros por tipo/data reais, replicar.
11. **Extrato Financeiro** – Filtros por período ou métricas adicionais, se existirem.
12. **Detalhes Clientes** – Ações "Importar/Adicionar/Excluir contratos" na página.

---

## Parte 3 – Plano de ação (fases e prioridades)

### Fase 0 – Alinhamento e decisões (1 dia)
- [ ] **0.1** Definir com negócio/dono do produto: Base de Cálculo, Cadastro Geral, Financiamento, Empréstimos e Xeque são apenas telas de **cálculo/simulação** (sem persistir) ou **persistem** em alguma tabela? Se persistirem, qual tabela/RPC?
- [ ] **0.2** Confirmar se "Gerar Documentos" e "Quitação" já têm RPC/serviço no Supabase ou se precisam ser criados.
- [ ] **0.3** Listar no Flutter, campo a campo, os rótulos de Base de Cálculo (15), Cadastro Geral (18), Financiamento (16), Empréstimos (13) e Xeque (quantos forem) para ter checklist de migração.

---

### Fase 1 – Telas placeholder → conteúdo (prioridade máxima)

Ordem sugerida (por impacto e dependência):

#### 1.1 Base de Cálculo (2–3 dias)
- [ ] Abrir `base_de_calculo_widget.dart` e listar os 15 campos com rótulo exato (já extraídos acima: Cliente, Dados do Contrato [Cheque/Nota], Fone, Cel, Com, CPF, Banco, Base de Calculo, Valor, Taxa, Primeiro Vencimento, Parcelas, Taxa de Juros, Valor total, Valor por parcela, Custodia, Valor).
- [ ] Criar em React formulário com os mesmos campos (dropdown cliente usando `getCustomersAutocomplete` ou lista), radio Cheque/Nota Promissória, máscaras (CPF, moeda).
- [ ] Implementar botões "Cancelar" (voltar) e "Salvar Contrato": se persistir, criar/uso RPC ou insert em `contracts` (ou tabela específica conforme Fase 0).
- [ ] Usar design system (`@/lib/design`, `input`, `label`, `buttonPrimary`).

#### 1.2 Cadastro Geral (2–3 dias)
- [ ] Extrair do `cadastro_geral_widget.dart` os 18 rótulos e tipos (texto, número, data, dropdown).
- [ ] Definir modelo de dados (uma tabela? várias? RPC?).
- [ ] Implementar página React com formulário e persistência.
- [ ] Testar com company_id.

#### 1.3 Financiamento (2–3 dias)
- [ ] Extrair do `financiamento_widget.dart` os 16 campos e rótulos.
- [ ] Implementar página com formulário; definir se é só cálculo ou se salva (e onde).
- [ ] Replicar validações e máscaras do Flutter.

#### 1.4 Empréstimos (1,5–2 dias)
- [ ] Extrair do `emprestimos_widget.dart` os 13 campos.
- [ ] Implementar formulário e lógica (cálculo e/ou persistência conforme Fase 0).

#### 1.5 Xeque Financiamento (1,5–2 dias)
- [ ] Analisar `xeque_financiamento_widget.dart` (campos, botões, fluxo).
- [ ] Implementar página React equivalente.

---

### Fase 2 – Integrações críticas (1–2 dias cada)

#### 2.1 Gerar Documentos (PDF)
- [ ] Verificar se existe RPC/função no Supabase para gerar PDF (ex.: por contrato_id).
- [ ] Se não existir: criar migration + RPC ou Edge Function que gere/armazene PDF e retorne URL.
- [ ] Na tela Gerar Documentos e no PopupGerarPdf: chamar serviço, exibir link ou abrir PDF em nova aba.

#### 2.2 Quitação (visualizador/link)
- [ ] Definir origem do documento de quitação (Storage? mesma RPC do PDF?).
- [ ] No PopupQuitacao: exibir link de download ou iframe/visualizador do PDF.

#### 2.3 Upload em Cadastrar Cliente
- [ ] Definir bucket e estrutura (ex.: `customer_files/{customer_id}/{filename}`).
- [ ] Adicionar no `cliente-form.tsx` (ou página) componente de upload (múltiplos arquivos se o Flutter tiver).
- [ ] Salvar metadados em `customer_files` se a tabela existir; senão apenas Storage e exibir lista de anexos.

---

### Fase 3 – Paridade e polimento (contínuo)

#### 3.1 Simulação
- [ ] Comparar campo a campo e fórmula (PMT) entre Flutter e React; ajustar se faltar algo.

#### 3.2 Fluxo de Caixa
- [ ] Se no Flutter houver filtros reais por tipo/data, implementar no React (dropdowns ligados a `company_expenses`).

#### 3.3 Extrato Financeiro
- [ ] Adicionar filtro por período (mês/ano) e quaisquer métricas extras do Flutter.

#### 3.4 Detalhes Clientes
- [ ] Implementar "Adicionar contrato" (link para novo-contrato com customer_id), "Excluir contrato" (soft delete ou confirmação), "Importar" se for requisito.

#### 3.5 UX
- [ ] Loading, tratamento de erro e estados vazios em todas as telas migradas.
- [ ] Acessibilidade (labels, focus, aria).
- [ ] Testes manuais de fluxo completo (cliente → contrato → parcelas → inadimplentes → documentos).

---

## Parte 4 – Cronograma sugerido (resumo)

| Fase | Itens | Estimativa |
|------|--------|------------|
| **0** | Decisões (persistência Base/Cadastro/Financiamento/Empréstimos/Xeque; PDF/Quitação) | 1 dia |
| **1** | Base de Cálculo, Cadastro Geral, Financiamento, Empréstimos, Xeque | 8–12 dias |
| **2** | Gerar PDF, Quitação, Upload Cadastrar Cliente | 2–4 dias |
| **3** | Simulação, Fluxo, Extrato, Detalhes Clientes, polimento | 3–5 dias |

**Total estimado:** ~14–22 dias de desenvolvimento focado (dependendo de existência de RPCs e complexidade real dos formulários Flutter).

---

## Parte 5 – Checklist rápido por tela React

| Página | Rota | Status | Ação |
|--------|------|--------|------|
| Home | `/home` | ✅ | Nenhuma |
| Clientes | `/clientes` | ✅ | Só upload (Fase 2) |
| Cadastrar Cliente | `/cadastrar-cliente` | ✅ | Upload (Fase 2) |
| Editar Cliente | `/editar-cliente/[id]` | ✅ | Nenhuma |
| Detalhes Clientes | `/detalhes-clientes/[id]` | ✅ | Ações contratos (Fase 3) |
| Contratos | `/contratos` | ✅ | Nenhuma |
| Novo Contrato | `/novo-contrato` | ✅ | Conferir campos (Fase 3) |
| Detalhes Contrato | `/detalhes-contrato/[id]` | ✅ | Nenhuma |
| Editar Contrato | `/editar-contrato/[id]` | ✅ | Nenhuma |
| Inadimplentes | `/inadimplentes01` | ✅ | Nenhuma |
| Fluxo de Caixa | `/fluxo-caixa` | ✅ | Filtros (Fase 3) |
| Cadastrar Fluxo | `/cadastrar-fluxo-de-caixa` | ✅ | Nenhuma |
| Editar Fluxo | `/fluxo-caixa/editar/[id]` | ✅ | Nenhuma |
| Extrato Financeiro | `/extrato-fianceiro` | ✅ | Filtro período (Fase 3) |
| Simulação | `/simulacao` | ✅ | Paridade campos (Fase 3) |
| Gerar Documentos | `/gerardocumentosnovo` | ⚠️ | Integração PDF (Fase 2) |
| Cadastrar Acesso | `/cadastrar-acesso` | ✅ | Nenhuma |
| Perfil | `/profile06` | ✅ | Nenhuma |
| **Base de Cálculo** | `/base-de-calculo` | ❌ | **Fase 1.1** |
| **Cadastro Geral** | `/cadastro-geral` | ❌ | **Fase 1.2** |
| **Financiamento** | `/financiamento` | ❌ | **Fase 1.3** |
| **Empréstimos** | `/emprestimos` | ❌ | **Fase 1.4** |
| **Xeque Financiamento** | `/xeque-financiamento` | ❌ | **Fase 1.5** |

---

Este documento deve ser o guia até ter **tudo** que está no Flutter disponível no React. Atualize o status das tarefas conforme for fechando cada item.

---

## Anexo A – Campos por tela (extraídos do Flutter)

### Base de Cálculo (15 campos)
| # | Rótulo | Tipo / Observação |
|---|--------|-------------------|
| 1 | Cliente | Dropdown "Selecionar Cliente" |
| 2 | Dados do Contrato | Radio: Cheque / Nota Promissória |
| 3 | Fone | Texto |
| 4 | Cel | Texto |
| 5 | Com | Texto (comercial) |
| 6 | CPF | Texto (máscara CPF) |
| 7 | Banco | Texto |
| 8 | Base de Calculo | Texto (ex.: LCMO02598) |
| 9 | Valor | Moeda |
| 10 | Taxa | Percentual (ex.: 5%) |
| 11 | Primeiro Vencimento | Data |
| 12 | Parcelas | Número |
| 13 | Taxa de Juros (%) | Percentual |
| 14 | Valor total | Moeda |
| 15 | Valor por parcela | Moeda |
| 16 | Custodia | Texto |
| 17 | Valor (custódia) | Moeda |
| Botões | Cancelar | Voltar |
| | Salvar Contrato | Persistir |

### Financiamento (16 campos)
| # | Rótulo | Observação |
|---|--------|------------|
| 1 | Cliente | Dropdown "Selecionar Cliente" |
| 2 | Dados do Contrato | Radio: Financiamento (Caixa) / Financiamento Aprovado |
| 3 | Fone, Cel, Com | Contatos |
| 4 | Taxa (ex.: 5,00 %) | Percentual |
| 5 | CPF, Banco | Texto |
| 6 | Valor Financiado | Moeda |
| 7 | Base (LCMO…) | Código |
| 8 | Taxa | Percentual |
| 9 | Parcela Sugerida | Moeda |
| 10 | Primeiro Vencimento | Data (ex.: 14/08/2025) |
| 11 | Valor total | Moeda |
| 12 | Valor por parcela | Moeda |
| 13 | Residuo | Moeda |
| 14 | Total de Parcelas | Número |
| 15 | Valor (x2) | Moeda |
| 16 | Ajuste | Moeda |
| Botões | Cancelar | Salvar Contrato |

### Empréstimos (13 campos)
| # | Rótulo | Observação |
|---|--------|------------|
| 1 | Dados do Emprestimo | Radio: Acordo Guiado / Acordo Negociado |
| 2 | Codigo do Cliente | hint: "Digite o codigo do Cliente" |
| 3 | Nome do Cliente | label/hint: Nome / Email |
| 4 | Taxa de NP | — |
| 5 | Total de Emp | — |
| 6 | Dias em Atraso | "Total de Dias em Atraso" |
| 7 | Multas | "Taxa de Multa" |
| 8 | Juros | "Total de Juros" |
| 9 | Sub-total | — |
| 10 | Saldo | — |
| 11 | Desconto | — |
| 12 | Adiantamento | "Entrada / Adiantamento" |
| 13 | Total a Pagar | — |
| 14 | Observação | — |
| Botões | Extrato | Atualizar Saldo |

### Cadastro Geral (18 campos)
| # | Rótulo (exemplo do Flutter) | Observação |
|---|-----------------------------|------------|
| 1 | Dados do Cadastro (seção) | — |
| 2 | Codigo do Cliente | textController1 |
| 3–18 | (demais campos) | Extrair do arquivo `cadastro_geral_widget.dart` na ordem dos textController2…18; há 18 controllers no model. |

**Sugestão:** Abrir `cadastro_geral_widget.dart` e, na ordem em que aparecem os `TextFormField` com `controller: _model.textControllerN`, anotar o rótulo do `Text()` imediatamente acima para ter a lista exata.

### Xeque Financiamento
- **Tela principal:** Lista em tabela com colunas: Nome (ex.: Ana Oliveira), Valor (R$ 2.750,00), Tipo (Xeque), Data (01/10/2025).
- **Ação:** Botão "Cadastrar Novo Xeque/Financiamento" abre um **dialog** com o componente `NovoXequeWidget`.
- **Formulário novo xeque:** componente `NovoXequeWidget` em `lib/componentes/novo_xeque/novo_xeque_widget.dart`. Analisar esse arquivo para listar os campos do dialog "Cadastrar Novo Xeque/Financiamento".
