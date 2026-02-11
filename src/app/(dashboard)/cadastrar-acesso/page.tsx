'use client'

import { Button, Input, Modal } from '@/components/ui'
import { LoadingScreen } from '@/components/ui'
import {
  getCompanyUsers,
  createCompanyUser,
  updateCompanyUser,
  deactivateCompanyUser,
  type CreateCompanyUserInput,
  type UpdateCompanyUserInput,
} from '@/lib/supabase/users'
import type { CompanyUser } from '@/types/database'
import { useCompanyId } from '@/hooks/use-company-id'
import { pageTitle, pageSubtitle, card, tableHead, tableCell, tableCellMuted } from '@/lib/design'
import { useCallback, useEffect, useState } from 'react'

export default function CadastrarAcessoPage() {
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()
  const [users, setUsers] = useState<CompanyUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', role: '' })
  const [submitLoading, setSubmitLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const list = await getCompanyUsers(companyId)
      setUsers(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar usuários.')
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    if (!companyId) return
    fetchUsers()
  }, [companyId, fetchUsers])

  const openCreate = () => {
    setForm({ name: '', email: '', role: '' })
    setFormError(null)
    setCreateOpen(true)
  }

  const openEdit = (u: CompanyUser) => {
    setForm({
      name: u.name ?? '',
      email: u.email ?? '',
      role: u.role ?? '',
    })
    setFormError(null)
    setEditingId(u.id)
  }

  const closeModals = () => {
    setCreateOpen(false)
    setEditingId(null)
    setFormError(null)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return
    if (!form.name.trim() || !form.email.trim()) {
      setFormError('Nome e e-mail são obrigatórios.')
      return
    }
    setSubmitLoading(true)
    setFormError(null)
    try {
      const input: CreateCompanyUserInput = {
        company_id: companyId,
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role.trim() || null,
      }
      await createCompanyUser(input)
      closeModals()
      await fetchUsers()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erro ao criar acesso.')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId || !editingId) return
    if (!form.name.trim() || !form.email.trim()) {
      setFormError('Nome e e-mail são obrigatórios.')
      return
    }
    setSubmitLoading(true)
    setFormError(null)
    try {
      const input: UpdateCompanyUserInput = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role.trim() || null,
      }
      await updateCompanyUser(editingId, companyId, input)
      closeModals()
      await fetchUsers()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erro ao atualizar.')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDeactivate = async (user: CompanyUser) => {
    if (!companyId) return
    if (!confirm(`Desativar o acesso de ${user.name ?? user.email}?`)) return
    setSubmitLoading(true)
    setError(null)
    try {
      await deactivateCompanyUser(user.id, companyId)
      await fetchUsers()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao desativar.')
    } finally {
      setSubmitLoading(false)
    }
  }

  if (companyLoading) return <LoadingScreen message="Carregando..." />
  if (companyError || !companyId) {
    return (
      <div className="p-6">
        <h1 className={pageTitle}>Cadastrar Acesso</h1>
        <p className="mt-2 text-amber-600">
          Configure sua empresa (company_users) para acessar esta tela.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={pageTitle}>Cadastrar Acesso</h1>
          <p className={pageSubtitle}>
            Usuários com acesso à empresa
          </p>
        </div>
        <Button type="button" variant="primary" onClick={openCreate}>
          Novo acesso
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E3A8A] border-t-transparent" />
        </div>
      ) : (
        <div className={card + ' overflow-hidden'}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E0E3E7]">
              <thead>
                <tr className={tableHead}>
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-left">E-mail</th>
                  <th className="px-4 py-3 text-left">Função</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E3E7] bg-white">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[#57636C]">
                      Nenhum usuário com acesso ativo.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#f1f4f8]">
                      <td className={tableCell}>{u.name ?? '—'}</td>
                      <td className={tableCellMuted}>{u.email ?? '—'}</td>
                      <td className={tableCellMuted}>{u.role ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            className="font-medium text-[#1E3A8A] hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeactivate(u)}
                            disabled={submitLoading}
                            className="font-medium text-red-600 hover:underline disabled:opacity-50"
                          >
                            Desativar
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

      {/* Modal Criar */}
      <Modal
        open={createOpen}
        onClose={closeModals}
        title="Novo acesso"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeModals}>
              Cancelar
            </Button>
            <Button type="submit" form="form-create" disabled={submitLoading}>
              {submitLoading ? 'Salvando...' : 'Criar'}
            </Button>
          </>
        }
      >
        <form id="form-create" onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          <Input
            label="Nome"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <Input
            label="Função (opcional)"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          />
        </form>
      </Modal>

      {/* Modal Editar */}
      <Modal
        open={!!editingId}
        onClose={closeModals}
        title="Editar acesso"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeModals}>
              Cancelar
            </Button>
            <Button type="submit" form="form-edit" disabled={submitLoading}>
              {submitLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        }
      >
        <form id="form-edit" onSubmit={handleUpdate} className="space-y-4">
          {formError && (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          <Input
            label="Nome"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <Input
            label="Função (opcional)"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          />
        </form>
      </Modal>
    </div>
  )
}
