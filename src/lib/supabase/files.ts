import { createClient } from '@/lib/supabase/client'
import type { CustomerFile, ContractFile } from '@/types/database'

/** Nome do bucket de documentos no Supabase Storage. Crie em Storage com este nome ou defina NEXT_PUBLIC_SUPABASE_BUCKET_DOCUMENTS. */
const BUCKET =
  typeof process.env.NEXT_PUBLIC_SUPABASE_BUCKET_DOCUMENTS === 'string' &&
  process.env.NEXT_PUBLIC_SUPABASE_BUCKET_DOCUMENTS.length > 0
    ? process.env.NEXT_PUBLIC_SUPABASE_BUCKET_DOCUMENTS
    : 'documents'

// ──────────────────────────── Helpers ──────────────────────────────

async function uploadToStorage(
  path: string,
  file: File
): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path)

  return publicUrl
}

async function removeFromStorage(path: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
}

// ──────────────────────────── Customer files ──────────────────────

export async function uploadCustomerFile(
  customerId: string,
  companyId: string,
  file: File,
  fileTypeId: number,
  notes?: string | null
): Promise<CustomerFile> {
  const path = `customers/${companyId}/${customerId}/${Date.now()}_${file.name}`
  const fileUrl = await uploadToStorage(path, file)

  const supabase = createClient()
  const { data, error } = await supabase
    .from('customer_files')
    .insert({
      company_id: companyId,
      customer_id: customerId,
      file_type_id: fileTypeId,
      file_url: fileUrl,
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
    return uploadToStorage(path, item.file).then((fileUrl) => ({
      fileUrl,
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
    file_url: r.fileUrl,
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
  return (data ?? []) as CustomerFile[]
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
  const fileUrl = await uploadToStorage(path, file)

  const supabase = createClient()
  const { data, error } = await supabase
    .from('contract_files')
    .insert({
      company_id: companyId,
      contract_id: contractId,
      file_type_id: fileTypeId,
      file_url: fileUrl,
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
  return (data ?? []) as ContractFile[]
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
