'use client'

import { Button, Input, Modal } from '@/components/ui'
import { LoadingScreen } from '@/components/ui'
import { createCompanyUserWithPassword } from '@/app/(dashboard)/cadastrar-acesso/actions'
import {
  getCompanyUsers,
  updateCompanyUser,
  deactivateCompanyUser,
  type UpdateCompanyUserInput,
} from '@/lib/supabase/users'
import type { CompanyUser } from '@/types/database'
import { useCompanyId } from '@/hooks/use-company-id'
import { buttonPrimary, card, input, label as labelClass, pageTitle } from '@/lib/design'
import { useCallback, useEffect, useState } from 'react'
import { MdEdit, MdPersonOff } from 'react-icons/md'

export default function CadastrarAcessoPage() {
  const { companyId, loading: companyLoading, error: companyError } = useCompanyId()
  const [users, setUsers] = useState<CompanyUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [createName, setCreateName] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '' })
  const [submitLoading, setSubmitLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [createSuccessPassword, setCreateSuccessPassword] = useState<string | null>(null)

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

  const openEdit = (u: CompanyUser) => {
    setEditForm({
      name: u.name ?? '',
      email: u.email ?? '',
      role: u.role ?? '',
    })
    setFormError(null)
    setEditingId(u.id)
  }

  const closeEditModal = () => {
    setEditingId(null)
    setFormError(null)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return
    const name = createName.trim()
    const email = createEmail.trim()
    if (!name || !email) {
      setFormError('Nome completo e e-mail são obrigatórios.')
      return
    }
    setSubmitLoading(true)
    setFormError(null)
    try {
      setCreateSuccessPassword(null)
      const result = await createCompanyUserWithPassword(companyId, name, email, null)
      if (result.ok) {
        setCreateName('')
        setCreateEmail('')
        setCreateSuccessPassword(result.temporaryPassword)
        await fetchUsers()
      } else {
        setFormError(result.error)
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erro ao criar acesso.')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId || !editingId) return
    if (!editForm.name.trim() || !editForm.email.trim()) {
      setFormError('Nome e e-mail são obrigatórios.')
      return
    }
    setSubmitLoading(true)
    setFormError(null)
    try {
      const payload: UpdateCompanyUserInput = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        role: editForm.role.trim() || null,
      }
      await updateCompanyUser(editingId, companyId, payload)
      closeEditModal()
      await fetchUsers()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erro ao atualizar.')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleRemoverAcesso = async (user: CompanyUser) => {
    if (!companyId) return
    const nome = user.name ?? user.email ?? 'este usuário'
    if (
      !confirm(
        `Remover o acesso de ${nome}? Essa pessoa não poderá mais acessar a plataforma com esta empresa.`
      )
    )
      return
    setSubmitLoading(true)
    setError(null)
    try {
      await deactivateCompanyUser(user.id, companyId)
      closeEditModal()
      await fetchUsers()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao remover acesso.')
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
          Sua conta não está vinculada a nenhuma empresa, ou ocorreu um erro ao carregar. Faça login com um usuário que já tenha acesso a uma empresa (cadastrado em Cadastrar Acesso).
        </p>
        {companyError && (
          <p className="mt-2 text-sm text-red-600">{companyError.message}</p>
        )}
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className={pageTitle}>Cadastrar Acesso</h1>

      {error && (
        <div className="mt-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Card Novo Cadastro */}
      <div className={card + ' mt-6 p-6'}>
        <h2 className="text-center text-lg font-semibold text-[#14181B]">
          Novo Cadastro
        </h2>
        <form onSubmit={handleCreate} className="mx-auto mt-6 max-w-md space-y-4">
          {formError && !editingId && (
            <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          <input
            type="text"
            className={input}
            placeholder="Nome completo"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            required
            aria-label="Nome completo"
          />
          <input
            type="email"
            className={input}
            placeholder="Email"
            value={createEmail}
            onChange={(e) => setCreateEmail(e.target.value)}
            required
            aria-label="Email"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={submitLoading}
            className={buttonPrimary + ' w-full'}
          >
            {submitLoading ? 'Cadastrando...' : 'Cadastrar'}
          </Button>
          {createSuccessPassword && (
            <div
              className="rounded-[8px] border border-[#249689]/40 bg-[#249689]/10 px-4 py-3 text-sm text-[#14181B]"
              role="status"
            >
              <p className="font-medium text-[#249689]">Usuário criado com sucesso.</p>
              <p className="mt-1">
                Senha padrão: <strong className="font-mono">{createSuccessPassword}</strong>
              </p>
              <p className="mt-1 text-[#57636C]">
                Envie essa senha ao usuário e peça que ele troque no primeiro acesso (Perfil).
              </p>
              <button
                type="button"
                onClick={() => setCreateSuccessPassword(null)}
                className="mt-2 text-sm font-medium text-[#1E3A8A] hover:underline"
              >
                Fechar
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Card Usuários Cadastrados */}
      <div className={card + ' mt-6 overflow-hidden'}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E0E3E7] px-5 py-4">
          <h2 className="text-lg font-semibold text-[#14181B]">
            Usuários Cadastrados
          </h2>
          <span className="text-sm text-[#57636C]">Total: {users.length}</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E3A8A] border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#57636C]">
            Nenhum usuário cadastrado.
          </p>
        ) : (
          <ul className="divide-y divide-[#E0E3E7]">
            {users.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 hover:bg-[#f8fafc]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#14181B]">
                    {u.name ?? '—'}
                  </p>
                  <p className="mt-0.5 text-sm text-[#57636C]">{u.email ?? '—'}</p>
                  {u.role != null && u.role.trim() !== '' && (
                    <p className="mt-0.5 text-sm text-[#57636C]">
                      Função: {u.role}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(u)}
                    className="rounded-[8px] p-2 text-[#57636C] transition hover:bg-[#f1f4f8] hover:text-[#1E3A8A]"
                    aria-label={`Editar ${u.name ?? u.email}`}
                  >
                    <MdEdit className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoverAcesso(u)}
                    disabled={submitLoading}
                    className="rounded-[8px] p-2 text-[#57636C] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    aria-label={`Remover acesso de ${u.name ?? u.email}`}
                    title="Remover acesso"
                  >
                    <MdPersonOff className="h-5 w-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal Editar */}
      <Modal
        open={!!editingId}
        onClose={closeEditModal}
        title="Editar acesso"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeEditModal}>
              Cancelar
            </Button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  const u = users.find((x) => x.id === editingId)
                  if (u) handleRemoverAcesso(u)
                }}
                disabled={submitLoading}
                className="rounded-[8px] border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                Remover acesso
              </button>
            )}
            <Button type="submit" form="form-edit" disabled={submitLoading}>
              {submitLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        }
      >
        <form id="form-edit" onSubmit={handleUpdate} className="space-y-4">
          {formError && (
            <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div>
            <label htmlFor="edit-name" className={labelClass}>
              Nome completo
            </label>
            <Input
              id="edit-name"
              value={editForm.name}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, name: e.target.value }))
              }
              required
            />
          </div>
          <div>
            <label htmlFor="edit-email" className={labelClass}>
              Email
            </label>
            <Input
              id="edit-email"
              type="email"
              value={editForm.email}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, email: e.target.value }))
              }
              required
            />
          </div>
          <div>
            <label htmlFor="edit-role" className={labelClass}>
              Função (opcional)
            </label>
            <Input
              id="edit-role"
              value={editForm.role}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, role: e.target.value }))
              }
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
