# Notificações no header

Não existe app mobile — só este painel web. As notificações são **apenas no sino do header** (dropdown in-app).

## Faz sentido?

Sim, de forma **enxuta**. Não há gateway de pagamento; os eventos vêm de:

1. **Parcelas atrasadas** – O cron diário (`mark_overdue_installments`) já marca parcelas vencidas como OVERDUE. Podemos listar “parcelas que venceram / ficaram atrasadas recentemente”.
2. **Pagamentos registrados no app** – Quando alguém registra um pagamento (botão “Pagar” na parcela), podemos mostrar “Pagamento recebido – Cliente X – R$ Y” no sino.

Ou seja: o sino pode ser alimentado só com dados que já existem (parcelas + pagamentos), sem tabela de notificações e sem gateway.

## Proposta mínima (v1)

- **Dropdown do sino**: listar eventos recentes (ex.: últimos 7 dias):
  - Parcelas que venceram ou foram marcadas como atrasadas (OVERDUE).
  - Pagamentos registrados (`installment_payments` com `created_at`).
- **Badge**: número real de itens “recentes” (ou só indicador de “tem coisa nova”), em vez de placeholder fixo.
- **Sem e-mail/push**; só o sino neste painel.

## Implementação (feito)

1. **Backend** – `src/lib/supabase/activity.ts`: `getRecentActivity(companyId)` retorna:
   - Até 5 parcelas atrasadas (não quitadas), com cliente e valor em aberto.
   - Até 10 pagamentos registrados nos últimos 7 dias, com cliente e valor.
2. **Front** – Header: dropdown do sino chama essa função ao ter `companyId`, exibe lista real, badge quando há itens, link “Ver inadimplentes” no rodapé.
3. Cada item leva ao detalhe do contrato (`/detalhes-contrato/[id]`).
