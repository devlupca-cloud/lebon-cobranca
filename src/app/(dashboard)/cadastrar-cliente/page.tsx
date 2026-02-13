'use client'

import { ClienteForm } from '@/components/cliente-form'
import { useHeader } from '@/contexts/header-context'
import { useEffect } from 'react'

export default function CadastrarClientePage() {
  const { setTitle, setBreadcrumb } = useHeader()

  useEffect(() => {
    setTitle('Cadastrar Cliente')
    setBreadcrumb([
      { label: 'Home', href: '/home' },
      { label: 'Clientes', href: '/clientes' },
      { label: 'Cadastrar Cliente' }
    ])

    return () => {
      setTitle('')
      setBreadcrumb([])
    }
  }, [setTitle, setBreadcrumb])

  return <ClienteForm mode="create" />
}
