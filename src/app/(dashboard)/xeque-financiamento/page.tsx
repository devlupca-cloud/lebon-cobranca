'use client'

import { Button, Input, LoadingScreen, Modal } from '@/components/ui'
import { useCompanyId } from '@/hooks/use-company-id'
import { card, input, label as labelClass, pageTitle, pageSubtitle, buttonPrimary, buttonSecondary, tableHead, tableCell, tableCellMuted } from '@/lib/design'
import Link from 'next/link'
import { useState } from 'react'
import { MdArrowBack, MdAdd } from 'react-icons/md'
import { maskCurrency } from '@/lib/format'

type TipoRegistro = 'xeque' | 'financiamento'

type XequeItem = {
  id: string
  nome: string
  valor: string
  tipo: TipoRegistro
  data: string
}

function formatCurrency(s: string): string {
  if (!s.trim()) return '—'
  const n = parseFloat(s.replace(/\./g, '').replace(',', '.'))
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

export default function XequeFinanciamentoPage() {
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()

  const [items, setItems] = useState<XequeItem[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [formNome, setFormNome] = useState('')
  const [formValor, setFormValor] = useState('')
  const [formTipo, setFormTipo] = useState<TipoRegistro>('xeque')
  const [formData, setFormData] = useState(new Date().toISOString().split('T')[0])
  const [message, setMessage] = useState<string | null>(null)

  const handleOpenModal = () => {
    setFormNome('')
    setFormValor('')
    setFormTipo('xeque')
    setFormData(new Date().toISOString().split('T')[0])
    setMessage(null)
    setModalOpen(true)
  }

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formNome.trim()) {
      setMessage('Informe o nome.')
      return
    }
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        nome: formNome.trim(),
        valor: formValor,
        tipo: formTipo,
        data: formData,
      },
    ])
    setModalOpen(false)
  }

  if (companyLoading) return <LoadingScreen message="Carregando..." />
  if (companyError || !companyId) {
    return (
      <div className="p-6">
        <h1 className={pageTitle}>Xeque Financiamento</h1>
        <p className="mt-2 text-amber-600">Configure sua empresa para acessar esta tela.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className={pageTitle}>Xeque/Financiamento</h1>
          <p className={pageSubtitle}>Controle de xeques e financiamentos</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOpenModal} className={buttonPrimary + ' inline-flex items-center gap-2'}>
            <MdAdd className="h-5 w-5" />
            Cadastrar novo xeque/financiamento
          </Button>
          <Link href="/home" className={buttonSecondary + ' inline-flex items-center gap-2'}>
            <MdArrowBack className="h-5 w-5" />
            Voltar
          </Link>
        </div>
      </div>

      <div className={card + ' overflow-hidden'}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr>
                <th className={tableHead}>Nome de empresa</th>
                <th className={tableHead}>Valor</th>
                <th className={tableHead}>Tipo</th>
                <th className={tableHead}>Data</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className={tableCellMuted + ' py-8 text-center'}>
                    Nenhum registro. Clique em &quot;Cadastrar novo xeque/financiamento&quot; para adicionar.
                  </td>
                </tr>
              )}
              {items.map((row) => (
                <tr key={row.id} className="border-t border-[#E0E3E7]">
                  <td className={tableCell}>{row.nome}</td>
                  <td className={tableCell}>{formatCurrency(row.valor)}</td>
                  <td className={tableCell}>{row.tipo === 'xeque' ? 'Xeque' : 'Financiamento'}</td>
                  <td className={tableCell}>
                    {row.data ? new Date(row.data + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Cadastrar novo xeque/financiamento">
        <form onSubmit={handleSalvar} className="space-y-4">
          {message && (
            <div className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {message}
            </div>
          )}
          <div>
            <label className={labelClass}>Nome</label>
            <Input
              value={formNome}
              onChange={(e) => setFormNome(e.target.value)}
              placeholder="Nome ou empresa"
              className={input}
            />
          </div>
          <div>
            <label className={labelClass}>Valor</label>
            <Input
              value={formValor}
              onChange={(e) => setFormValor(maskCurrency(e.target.value))}
              placeholder="0,00"
              className={input}
            />
          </div>
          <div>
            <label className={labelClass}>Tipo</label>
            <select
              value={formTipo}
              onChange={(e) => setFormTipo(e.target.value as TipoRegistro)}
              className={input}
            >
              <option value="xeque">Xeque</option>
              <option value="financiamento">Financiamento</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Data</label>
            <Input
              type="date"
              value={formData}
              onChange={(e) => setFormData(e.target.value)}
              className={input}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={() => setModalOpen(false)} className={buttonSecondary}>
              Cancelar
            </Button>
            <Button type="submit" className={buttonPrimary}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
