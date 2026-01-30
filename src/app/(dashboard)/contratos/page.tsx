'use client'

import { Button } from '@/components/ui'
import { LoadingScreen } from '@/components/ui'
import { PopupGerarPdf } from '@/components/popup-gerar-pdf'
import { PopupQuitacao } from '@/components/popup-quitacao'
import { getContracts } from '@/lib/supabase/contracts'
import { useCompanyId } from '@/hooks/use-company-id'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { Contract } from '@/types/database'

function formatCurrency(value: number | null) {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

export default function ContratosPage() {
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [quitacaoOpen, setQuitacaoOpen] = useState(false)
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null)

  const fetchContracts = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const list = await getContracts(companyId)
      setContracts(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar contratos.')
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    if (!companyId) return
    fetchContracts()
  }, [companyId, fetchContracts])

  if (companyLoading) return <LoadingScreen message="Carregando..." />
  if (companyError || !companyId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Contratos</h1>
        <p className="mt-2 text-amber-600">
          Configure sua empresa (company_users) para listar contratos.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Contratos</h1>
        <Link href="/novo-contrato">
          <Button type="button" variant="primary">
            Novo Contrato
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingScreen message="Carregando contratos..." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">
                    Número
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">
                    Parcelas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">
                    Inclusão
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {contracts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                      Nenhum contrato encontrado.
                    </td>
                  </tr>
                ) : (
                  contracts.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 text-sm text-zinc-900">
                        {c.contract_number ?? c.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600">
                        {formatCurrency(c.contract_amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600">
                        {c.installments_count}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600">
                        {formatDate(c.inclusion_date)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <span className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedContractId(c.id)
                              setPdfOpen(true)
                            }}
                            className="font-medium text-[#1E3A8A] hover:underline"
                          >
                            Gerar PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedContractId(c.id)
                              setQuitacaoOpen(true)
                            }}
                            className="font-medium text-[#1E3A8A] hover:underline"
                          >
                            Quitação
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PopupGerarPdf
        open={pdfOpen}
        onClose={() => {
          setPdfOpen(false)
          setSelectedContractId(null)
        }}
        contractId={selectedContractId}
      />
      <PopupQuitacao
        open={quitacaoOpen}
        onClose={() => {
          setQuitacaoOpen(false)
          setSelectedContractId(null)
        }}
        contractId={selectedContractId}
      />
    </div>
  )
}
