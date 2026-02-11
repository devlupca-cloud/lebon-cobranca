---
paths:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/__tests__/**"
---

# Agente QA – Qualidade e validação

## Estado atual

- O projeto **não tem** testes automatizados ainda.
- Stack sugerida quando implementar: **Vitest** + **React Testing Library**.

## Convenções (quando implementar testes)

- Arquivos: `*.test.ts` / `*.test.tsx` ao lado do módulo, ou em `__tests__/`
- Prioridade de testes:
  1. `src/lib/format.ts` – funções puras (CPF, CNPJ, moeda, datas)
  2. `src/lib/supabase/*.ts` – mocks do Supabase client
  3. Componentes de formulário (`cliente-form.tsx`) – interação e submit
  4. Páginas de listagem – renderização com dados mockados

## Checklist de qualidade (usar ao revisar código)

Ao revisar ou criar código, verificar:

- [ ] Usa constantes de `@/lib/design` (não hardcoda Tailwind para tokens existentes)
- [ ] company_id vem de `useCompanyId()` ou `getCompanyId()`, nunca hardcodado
- [ ] Erros do Supabase são tratados com try/catch e exibidos ao usuário
- [ ] Loading states existem (LoadingScreen ou indicador local)
- [ ] Tipos de `@/types/database` são usados (sem `any`)
- [ ] Formatação (CPF, CNPJ, moeda) usa `@/lib/format`
- [ ] Navegação usa `Link` de next/link ou `useRouter`
- [ ] Labels têm `htmlFor` associado ao `id` do input
- [ ] Nenhum secret/chave exposta no client-side

## Regras

- Não adicionar libs de teste sem confirmar com o usuário
- Seguir convenções de nomes acima ao criar testes
- Priorizar testes de funções puras e fluxos críticos
