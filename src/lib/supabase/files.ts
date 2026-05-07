import { createClient } from '@/lib/supabase/client'
import type { CustomerFile, ContractFile } from '@/types/database'
import {
  BUCKET_FILE,
  resolveStorageRefs,
  uploadFile as uploadFileToStorage,
} from '@/lib/supabase/storage'

/**
 * Coluna `file_url` na tabela `*_files` armazena o PATH no Storage
 * (ex: `customers/{companyId}/{customerId}/{ts}_{filename}`), nao mais a
 * URL publica. Para renderizacao usamos `signed_url` (gerada on-demand
 * em `getCustomerFiles` / `getContractFiles`). Dados antigos com URL
 * publica continuam funcionando — `resolveStorageRef` detecta o prefixo
 * `http(s)://` e retorna como esta.
 */

// ──────────────────────────── Customer files ──────────────────────

export async function uploadCustomerFile(
  customerId: string,
  companyId: string,
  file: File,
  fileTypeId: number,
  notes?: string | null
): Promise<CustomerFile> {
  const path = `customers/${companyId}/${customerId}/${Date.now()}_${file.name}`
  const storedPath = await uploadFileToStorage(path, file)

  const supabase = createClient()
  const { data, error } = await supabase
    .from('customer_files')
    .insert({
      company_id: companyId,
      customer_id: customerId,
      file_type_id: fileTypeId,
      file_url: storedPath,
      file_name: file.name,
      notes: notes ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as CustomerFile
}

export type UploadCustomerFileItem = {
  file: File
  fileTypeId: number
  notes?: string | null
}

/**
 * Upload de múltiplos arquivos em paralelo + uma única inserção em lote.
 * Reduz round-trips e tempo total em relação a N chamadas sequenciais a uploadCustomerFile.
 */
export async function uploadCustomerFilesBatch(
  customerId: string,
  companyId: string,
  items: UploadCustomerFileItem[]
): Promise<CustomerFile[]> {
  if (items.length === 0) return []

  const basePath = `customers/${companyId}/${customerId}`
  const timestamp = Date.now()

  const uploads = items.map((item, index) => {
    const path = `${basePath}/${timestamp}_${index}_${item.file.name}`
    return uploadFileToStorage(path, item.file).then((storedPath) => ({
      storedPath,
      fileTypeId: item.fileTypeId,
      file_name: item.file.name,
      notes: item.notes ?? null,
    }))
  })

  const results = await Promise.all(uploads)

  const supabase = createClient()
  const rows = results.map((r) => ({
    company_id: companyId,
    customer_id: customerId,
    file_type_id: r.fileTypeId,
    file_url: r.storedPath,
    file_name: r.file_name,
    notes: r.notes,
  }))

  const { data, error } = await supabase
    .from('customer_files')
    .insert(rows)
    .select()

  if (error) throw error
  return (data ?? []) as CustomerFile[]
}

export async function getCustomerFiles(
  customerId: string,
  companyId: string
): Promise<CustomerFile[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('customer_files')
    .select('*')
    .eq('customer_id', customerId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  const rows = (data ?? []) as CustomerFile[]
  const withUrls = await resolveStorageRefs(rows, 'file_url', BUCKET_FILE)
  return withUrls as CustomerFile[]
}

// ──────────────────────────── Contract files ─────────────────────

export async function uploadContractFile(
  contractId: string,
  companyId: string,
  file: File,
  fileTypeId: number,
  notes?: string | null
): Promise<ContractFile> {
  const path = `contracts/${companyId}/${contractId}/${Date.now()}_${file.name}`
  const storedPath = await uploadFileToStorage(path, file)

  const supabase = createClient()
  const { data, error } = await supabase
    .from('contract_files')
    .insert({
      company_id: companyId,
      contract_id: contractId,
      file_type_id: fileTypeId,
      file_url: storedPath,
      file_name: file.name,
      notes: notes ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as ContractFile
}

export async function getContractFiles(
  contractId: string,
  companyId: string
): Promise<ContractFile[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('contract_files')
    .select('*')
    .eq('contract_id', contractId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  const rows = (data ?? []) as ContractFile[]
  const withUrls = await resolveStorageRefs(rows, 'file_url', BUCKET_FILE)
  return withUrls as ContractFile[]
}

// ──────────────────────────── Delete file (soft) ─────────────────

export async function deleteCustomerFile(
  fileId: string,
  companyId: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('customer_files')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', fileId)
    .eq('company_id', companyId)

  if (error) throw error
}

export async function deleteContractFile(
  fileId: string,
  companyId: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('contract_files')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', fileId)
    .eq('company_id', companyId)

  if (error) throw error
}
