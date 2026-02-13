'use client'

import { Button, Input, LoadingScreen } from '@/components/ui'
import { useHeader } from '@/contexts/header-context'
import { useCompanyId } from '@/hooks/use-company-id'
import { card, input, label as labelClass, pageSubtitle, buttonPrimary, buttonSecondary } from '@/lib/design'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { MdArrowBack } from 'react-icons/md'
import { maskCurrency } from '@/lib/format'

type Conformidade = 'funcionario' | 'cliente' | 'cliente_bloqueado'

export default function CadastroGeralPage() {
  const { setTitle, setBreadcrumb } = useHeader()
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()

  useEffect(() => {
    setTitle('Cadastro Geral')
    setBreadcrumb([{ label: 'Home', href: '/home' }, { label: 'Cadastro Geral' }])
    return () => { setTitle(''); setBreadcrumb([]) }
  }, [setTitle, setBreadcrumb])

  const [conformidade, setConformidade] = useState<Conformidade>('cliente')
  const [codigoCliente, setCodigoCliente] = useState('')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [rg, setRg] = useState('')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cep, setCep] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [uf, setUf] = useState('')
  const [indicacaoNumero, setIndicacaoNumero] = useState('')
  const [nomeIndicacao, setNomeIndicacao] = useState('')
  const [celularIndicacao, setCelularIndicacao] = useState('')
  const [enderecoCobranca, setEnderecoCobranca] = useState('')
  const [complemento, setComplemento] = useState('')
  const [dataCadastro, setDataCadastro] = useState(new Date().toISOString().split('T')[0])
  const [limiteCredito, setLimiteCredito] = useState('')
  const [saldoDisponivel, setSaldoDisponivel] = useState('')
  const [observacao, setObservacao] = useState('')

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleAtualizarSaldo = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      await new Promise((r) => setTimeout(r, 500))
      setMessage('Cadastro geral não persiste no backend ainda. Campos preenchidos apenas em tela.')
    } finally {
      setLoading(false)
    }
  }

  if (companyLoading) return <LoadingScreen message="Carregando..." />
  if (companyError || !companyId) {
    return (
      <div className="p-6">
        <p className="text-amber-600">Configure sua empresa para acessar esta tela.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <p className={pageSubtitle}>
          Crie um novo contrato selecionando um cliente e preenchendo os dados financeiros
        </p>
        <Link href="/home" className={buttonSecondary + ' inline-flex items-center gap-2'}>
          <MdArrowBack className="h-5 w-5" />
          Voltar
        </Link>
      </div>

      <form onSubmit={handleAtualizarSaldo} className="space-y-6">
        {message && (
          <div className="rounded-[8px] border border-[#E0E3E7] bg-[#f1f4f8] px-4 py-2 text-sm text-[#57636C]">
            {message}
          </div>
        )}

        <div className={card + ' p-6'}>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#57636C]">
            Dados do Cadastro
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass}>Código do cliente</label>
              <Input
                value={codigoCliente}
                onChange={(e) => setCodigoCliente(e.target.value)}
                placeholder="Digite o código do cliente"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>CPF/CNPJ</label>
              <Input
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
                placeholder="Digite o CPF ou CNPJ"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>RG</label>
              <Input
                value={rg}
                onChange={(e) => setRg(e.target.value)}
                placeholder="Digite o RG"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Nome</label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite o nome do cliente"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite o email do cliente"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>CEP</label>
              <Input
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                placeholder="Digite o CEP do cliente"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Bairro</label>
              <Input
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Bairro do cliente"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Cidade</label>
              <Input
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Cidade do cliente"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>UF</label>
              <Input
                value={uf}
                onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="Unidade Federal"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Indicação (número)</label>
              <Input
                value={indicacaoNumero}
                onChange={(e) => setIndicacaoNumero(e.target.value)}
                placeholder="Número indicação"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Nome indicação</label>
              <Input
                value={nomeIndicacao}
                onChange={(e) => setNomeIndicacao(e.target.value)}
                placeholder="Nome da indicação"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Celular indicação</label>
              <Input
                value={celularIndicacao}
                onChange={(e) => setCelularIndicacao(e.target.value)}
                placeholder="Celular da indicação"
                className={input}
              />
            </div>
          </div>
        </div>

        <div className={card + ' p-6'}>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#57636C]">
            Dados Conformidades
          </h2>
          <div className="mb-6 flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="conformidade"
                checked={conformidade === 'funcionario'}
                onChange={() => setConformidade('funcionario')}
                className="h-4 w-4 text-[#1E3A8A] focus:ring-[#1E3A8A]"
              />
              <span className="text-sm text-[#14181B]">Funcionário</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="conformidade"
                checked={conformidade === 'cliente'}
                onChange={() => setConformidade('cliente')}
                className="h-4 w-4 text-[#1E3A8A] focus:ring-[#1E3A8A]"
              />
              <span className="text-sm text-[#14181B]">Cliente</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="conformidade"
                checked={conformidade === 'cliente_bloqueado'}
                onChange={() => setConformidade('cliente_bloqueado')}
                className="h-4 w-4 text-[#1E3A8A] focus:ring-[#1E3A8A]"
              />
              <span className="text-sm text-[#14181B]">Cliente Bloqueado</span>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2">
              <label className={labelClass}>Endereço de cobrança</label>
              <Input
                value={enderecoCobranca}
                onChange={(e) => setEnderecoCobranca(e.target.value)}
                placeholder="Endereço de cobrança"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Complemento</label>
              <Input
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                placeholder="Complemento"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Data do cadastro</label>
              <Input
                type="date"
                value={dataCadastro}
                onChange={(e) => setDataCadastro(e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Limite de crédito</label>
              <Input
                value={limiteCredito}
                onChange={(e) => setLimiteCredito(maskCurrency(e.target.value))}
                placeholder="Limite de crédito"
                className={input}
              />
            </div>
            <div>
              <label className={labelClass}>Saldo disponível</label>
              <Input
                value={saldoDisponivel}
                onChange={(e) => setSaldoDisponivel(maskCurrency(e.target.value))}
                placeholder="Saldo disponível"
                className={input}
              />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelClass}>Observação</label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Digite observação"
              rows={3}
              className={input + ' min-h-[80px] resize-y'}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/home" className={buttonSecondary}>
            Voltar
          </Link>
          <Button type="button" onClick={() => (window.location.href = '/extrato-fianceiro')} className={buttonSecondary}>
            Extrato
          </Button>
          <Button type="submit" disabled={loading} className={buttonPrimary}>
            {loading ? 'Salvando...' : 'Atualizar saldo'}
          </Button>
        </div>
      </form>
    </div>
  )
}
