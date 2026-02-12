# Varredura Flutter → React (App Lebon Marcos)

Comparação sistemática entre o app Flutter (`/Users/samanthamaia/development/app_lebon_marcos`) e o app React/Next.js (`app_lebon_marcos_web`).  
**Data da varredura:** fev/2025.

---

## 1. Rotas Flutter (nav.dart)

| # | Widget Flutter | Path Flutter | Rota React | Status React |
|---|----------------|--------------|------------|--------------|
| 1 | Login | `/login` | `(auth)/login` | ✅ Implementado |
| 2 | CadastreSe | `/cadastreSe` | `(auth)/cadastre-se` | ✅ Implementado |
| 3 | Home | `/home` | `/home` | ✅ Implementado (dashboard com % e cards) |
| 4 | Clientes | `/clientes` | `/clientes` | ✅ Implementado |
| 5 | CadastrarCliente | `/cadastrarCliente` (+ addEdit) | `/cadastrar-cliente` | ✅ Implementado |
| 6 | Contratos | `/contratos` | `/contratos` | ✅ Implementado |
| 7 | NovoContrato | `/novoContrato` | `/novo-contrato` | ✅ Implementado |
| 8 | Gerardocumentosnovo | `/gerardocumentosnovo` | `/gerardocumentosnovo` | ✅ Tela básica |
| 9 | Profile06 | `/profile06` | `/profile06` | ✅ Perfil + foto |
| 10 | BaseDeCalculo | `/baseDeCalculo` | `/base-de-calculo` | ⚠️ Placeholder "Em construção" |
| 11 | Financiamento | `/financiamento` | `/financiamento` | ⚠️ Placeholder "Em construção" |
| 12 | ExtratoFianceiro | `/extratoFianceiro` | `/extrato-fianceiro` | ✅ Implementado (resumo: a receber, recebido, inadimplente, contratos) |
| 13 | CadastrarAcesso | `/cadastrarAcesso` | `/cadastrar-acesso` | ✅ Tela com ações (company_users) |
| 14 | CadastroGeral | `/cadastroGeral` | `/cadastro-geral` | ⚠️ Placeholder "Em construção" |
| 15 | Simulacao | `/simulacao` | `/simulacao` | ✅ Tela (cálculo PMT / simulação) |
| 16 | CadastrarFluxoDeCaixa | `/cadastrarFluxoDeCaixa` | `/cadastrar-fluxo-de-caixa` | ✅ Form (empresa, nome, título, descrição, valor, vencimento, dia pagamento) |
| 17 | Emprestimos | `/emprestimos` | `/emprestimos` | ⚠️ Placeholder "Em construção" |
| 18 | XequeFinanciamento | `/xeque/financeiro` | `/xeque-financiamento` | ⚠️ Placeholder "Em construção" |
| 19 | FluxoCaixa | `/Fluxo_caixa` | `/fluxo-caixa` | ✅ Lista + navegação para cadastrar/editar |
| 20 | DetalhesClientes | `/detalhesClientes` | `/detalhes-clientes/[id]` | ✅ Implementado |
| 21 | Inadimplentes01 | `/inadimplentes01` | `/inadimplentes01` | ✅ Lista parcelas vencidas + totais |

---

## 2. Rotas que existem só no React (extras)

| Rota React | Descrição |
|------------|-----------|
| `/editar-cliente/[id]` | Edição de cliente (form com dados carregados) |
| `/detalhes-contrato/[id]` | Detalhes do contrato (no Flutter pode ser via modal/popup) |
| `/editar-contrato/[id]` | Edição de contrato |
| `/fluxo-caixa/[id]` | Detalhe de despesa (fluxo de caixa) |
| `/fluxo-caixa/editar/[id]` | Edição de despesa |

---

## 3. Sidebar: Flutter vs React

**Flutter (side_bar_widget.dart)** mostra no menu:
- Home, Clientes, Inadimplêntes, Contrato, Gerar Documentos, Simulação, Fluxo de Caixa, Extrato Financeiro, Cadastrar Acesso, Perfil.

**React (sidebar.tsx)** mostra:
- Home (via logo → `/home`), Clientes, Inadimplêntes, Contrato, Gerar Documentos, Simulação, Contas a pagar (fluxo-caixa), Extrato Financeiro, Cadastrar Acesso, Perfil.

Ou seja: os itens do menu são os mesmos. Base de Cálculo, Cadastro Geral, Financiamento, Empréstimos e Xeque Financiamento **não aparecem no menu do Flutter**; no React existem como páginas (placeholders) mas também não estão no sidebar.

---

## 4. O que está implementado de fato (React)

- **Auth:** login, cadastre-se, logout, rotas protegidas.
- **Home:** dashboard com totais (clientes, contratos, inadimplentes, valor a receber) e comparação com mês anterior.
- **Clientes:** listagem, cadastro, edição, detalhes por ID.
- **Contratos:** listagem, novo contrato, detalhes por ID, edição por ID.
- **Inadimplentes:** parcelas vencidas, totais, +90 dias.
- **Fluxo de caixa:** listagem, cadastro, edição e detalhe por ID (company_expenses).
- **Extrato financeiro:** resumo (total a receber, recebido, inadimplente, contratos ativos/encerrados).
- **Simulação:** tela com cálculo (ex.: PMT).
- **Gerar Documentos:** tela básica.
- **Cadastrar Acesso:** tela com ações (company_users).
- **Perfil (Profile06):** perfil e upload de foto.
- **Popups/modais:** detalhes cliente, parcelas, simulação, gerar PDF, quitação (estrutura; integração real de PDF/quitação pode estar pendente).

---

## 5. O que está faltando ou é só placeholder (React)

| Tela | Situação no Flutter | Situação no React |
|------|---------------------|-------------------|
| **Base de Cálculo** | Formulário grande (muitos campos) | Página com título + "Em construção" |
| **Cadastro Geral** | Tela com conteúdo | Placeholder "Em construção" |
| **Financiamento** | Formulário com muitos campos | Placeholder "Em construção" |
| **Empréstimos** | Formulário com vários campos | Placeholder "Em construção" |
| **Xeque Financiamento** | Tela específica | Placeholder "Em construção" |

**Resumo:** 5 telas existem como rota no React mas ainda sem migração do layout/lógica do Flutter (apenas placeholder).

---

## 6. Funcionalidades pontuais a conferir (já citadas em STATUS_MIGRACAO)

- Upload de arquivos em **Cadastrar Cliente** (Storage).
- **Gerar PDF** e **Quitação:** integração real com backend/PDF (hoje estrutura de popup).
- Polimento: loading, tratamento de erro, estados vazios, acessibilidade.

---

## 7. Conclusão da varredura

- **Todas as rotas do Flutter** têm correspondente no React (mesmo que placeholder).
- **Implementação completa** hoje: auth, home, clientes (CRUD + detalhes), contratos (lista, novo, detalhes, edição), inadimplentes, fluxo de caixa (CRUD), extrato financeiro, simulação, cadastrar acesso, perfil, gerar documentos (tela básica).
- **Faltando migrar (conteúdo):** Base de Cálculo, Cadastro Geral, Financiamento, Empréstimos, Xeque Financiamento — 5 telas.
- **Extras no React:** editar cliente, detalhes/editar contrato, detalhe/editar fluxo de caixa por ID.

Para fechar a paridade de funcionalidade com o Flutter, o próximo passo é implementar o conteúdo (formulários/regras) dessas 5 telas a partir dos widgets Flutter correspondentes em `lib/` do projeto `app_lebon_marcos`.
