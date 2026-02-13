# Header - Como usar

O header foi redesenhado com um sistema moderno e profissional. Aqui está como usar nas suas páginas.

## 🎨 Recursos do novo header

- **Título e breadcrumb** automáticos
- **Notificações** com badge animado
- **Menu do usuário** com dropdown
- **Avatar** personalizável
- **Conteúdo customizado** por página (botões, filtros, etc.)

## 📝 Como usar em uma página

### Opção 1: Título e Breadcrumb (recomendado)

```tsx
'use client'

import { useHeader } from '@/contexts/header-context'
import { useEffect } from 'react'

export default function MinhaPage() {
  const { setTitle, setBreadcrumb } = useHeader()

  useEffect(() => {
    setTitle('Minha Página')
    setBreadcrumb([
      { label: 'Home', href: '/home' },
      { label: 'Seção', href: '/secao' },
      { label: 'Minha Página' } // último item sem href (atual)
    ])

    return () => {
      setTitle('')
      setBreadcrumb([])
    }
  }, [setTitle, setBreadcrumb])

  return (
    <div className="p-6">
      {/* conteúdo da página */}
    </div>
  )
}
```

### Opção 2: Título + Botões de ação

```tsx
'use client'

import { useHeader } from '@/contexts/header-context'
import { Button } from '@/components/ui'
import { MdAdd } from 'react-icons/md'
import { useEffect } from 'react'
import Link from 'next/link'

export default function ClientesPage() {
  const { setTitle, setBreadcrumb, setLeftContent } = useHeader()

  useEffect(() => {
    setTitle('Clientes')
    setBreadcrumb([
      { label: 'Home', href: '/home' },
      { label: 'Clientes' }
    ])
    
    // Adiciona botões de ação ao lado do título
    setLeftContent(
      <div className="flex items-center gap-3 mt-2">
        <Link href="/cadastrar-cliente">
          <Button type="button">
            <MdAdd className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </Link>
      </div>
    )

    return () => {
      setTitle('')
      setBreadcrumb([])
      setLeftContent(null)
    }
  }, [setTitle, setBreadcrumb, setLeftContent])

  return (
    <div className="p-6">
      {/* conteúdo da página */}
    </div>
  )
}
```

### Opção 3: Conteúdo totalmente customizado

```tsx
'use client'

import { useHeader } from '@/contexts/header-context'
import { useEffect } from 'react'

export default function CustomPage() {
  const { setLeftContent } = useHeader()

  useEffect(() => {
    setLeftContent(
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Meu Layout Custom</h1>
        <input 
          type="search" 
          placeholder="Buscar..." 
          className="px-3 py-2 border rounded-lg"
        />
      </div>
    )

    return () => setLeftContent(null)
  }, [setLeftContent])

  return (
    <div className="p-6">
      {/* conteúdo da página */}
    </div>
  )
}
```

## 🎯 Estrutura do header

```
┌─────────────────────────────────────────────────────────────┐
│ [Breadcrumb] > [Breadcrumb]                    🔔  👤 User ▼│
│ Título da Página                                             │
│ [Botões de ação opcionais]                                   │
└─────────────────────────────────────────────────────────────┘
```

## 🔍 Componentes

### Lado esquerdo (dinâmico por página)
- Breadcrumb (navegação)
- Título da página
- Botões de ação (opcional)
- Ou conteúdo totalmente customizado

### Lado direito (fixo em todas as páginas)
- **Notificações**: sino com badge animado
- **Perfil do usuário**: 
  - Avatar com iniciais
  - Nome e empresa
  - Dropdown com:
    - Meu Perfil
    - Configurações
    - Sair

## 🎨 Estilo e cores

- **Fundo**: branco (`#ffffff`)
- **Borda**: `#E0E3E7`
- **Altura**: `64px` (h-16)
- **Texto primário**: `#14181B`
- **Texto secundário**: `#57636C`
- **Hover**: `#f1f4f8`
- **Primário (links)**: `#1E3A8A`

## ✅ Checklist ao criar nova página

- [ ] Importar `useHeader` do contexto
- [ ] Definir título com `setTitle()`
- [ ] Definir breadcrumb com `setBreadcrumb()`
- [ ] Limpar no cleanup do useEffect
- [ ] Adicionar botões de ação se necessário

## 🚀 Próximos passos

- Integrar dados reais do usuário (nome, email, avatar)
- Conectar notificações com backend
- Adicionar página de configurações
- Personalizar avatar com foto do usuário
