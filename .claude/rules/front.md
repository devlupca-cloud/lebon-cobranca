---
paths:
  - "src/app/**/*"
  - "src/components/**/*"
  - "src/contexts/**/*"
  - "src/hooks/**/*"
---

# Agente Front – Telas, componentes, rotas

## Stack

- **Next.js 16** (App Router), React, TypeScript, Tailwind CSS
- Pastas: `src/app/`, `src/components/`, `src/contexts/`, `src/hooks/`

## Padrão de página (dashboard)

Toda página em `src/app/(dashboard)/` segue este esqueleto:

```tsx
'use client'

import { useCompanyId } from '@/hooks/use-company-id'
import { useHeader } from '@/contexts/header-context'
import { LoadingScreen } from '@/components/ui'
import { pageTitle, pageSubtitle } from '@/lib/design'
// ... demais imports

export default function NomePage() {
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // ... estados específicos da página

  // Header actions (botões no cabeçalho)
  const { setLeftContent } = useHeader()
  useEffect(() => {
    setLeftContent(<div>...</div>)
    return () => setLeftContent(null)
  }, [setLeftContent])

  // Fetch de dados com useCallback + useEffect
  const fetchData = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      // chamada Supabase
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar.')
    } finally {
      setLoading(false)
    }
  }, [companyId, /* filtros */])

  useEffect(() => {
    if (!companyId) return
    fetchData()
  }, [companyId, fetchData])

  // Guards
  if (companyLoading) return <LoadingScreen message="Carregando..." />
  if (companyError || !companyId) return <div>...mensagem de configuração</div>

  // Render
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-6">
        <h1 className={pageTitle}>Título</h1>
        <p className={pageSubtitle}>Descrição</p>
      </div>
      {/* conteúdo */}
    </div>
  )
}
```

## Padrão de formulário

Formulários seguem o padrão de `cliente-form.tsx`:

- Estado local com `useState<FormState>(initialForm)` (sem react-hook-form por enquanto)
- Helper `updateForm(updates: Partial<FormState>)` para atualizar campos
- `buildPayload()` para montar o objeto antes de enviar ao Supabase
- `handleSubmit(e: React.FormEvent)` com try/catch, loading e error states
- Seções agrupadas em `<section className={card + ' p-6'}>` com `<h2>` interno
- Botões no rodapé: `buttonPrimary` (submit) + `buttonSecondary` (cancelar via Link)

## Regras obrigatórias

1. **Design system:** Sempre importar de `@/lib/design` (input, label, buttonPrimary, buttonSecondary, card, tableHead, tableCell, tableCellMuted, pillType, pageTitle, pageSubtitle). Nunca recriar essas classes.
2. **Ícones:** Usar `react-icons/md` (Material Design). Ex: `MdAdd`, `MdSearch`, `MdArrowBack`.
3. **Formatação:** Usar `@/lib/format` para CPF, CNPJ, datas, moeda. Nunca reimplementar.
4. **Componentes UI:** Usar `@/components/ui` (Button, Input, Modal, LoadingScreen) onde existirem.
5. **Navegação:** `Link` de `next/link` para links, `useRouter` para redirect programático.
6. **Tabelas:** Padrão com `<table>`, thead com bg `#f1f4f8`, usando constantes `tableHead`/`tableCell`/`tableCellMuted`.
7. **Erros:** Exibir em div com `rounded-[8px] border border-red-200 bg-red-50 text-red-700`.
8. **company_id:** Sempre via `useCompanyId()` (client) ou `getCompanyId()` (server/effect). Nunca hardcodar.

## Estrutura de rotas

- `src/app/(auth)/` – login, cadastre-se
- `src/app/(dashboard)/` – páginas internas (layout com Sidebar + Header)
- Componentes compartilhados em `src/components/` e `src/components/ui/`

## Migração FlutterFlow → React

Ao migrar uma tela do FlutterFlow:
1. Identificar os widgets e mapear para componentes React/HTML equivalentes
2. Seguir o esqueleto de página acima (não inventar padrão novo)
3. Manter os mesmos campos, validações e fluxo da tela original
4. Usar os helpers já existentes em `@/lib/format` e `@/lib/supabase/`
5. Nomear a rota igual ao FlutterFlow (slug em português, kebab-case)
