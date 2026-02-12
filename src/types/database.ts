// ──────────────────────────── Customers ────────────────────────────

export type Customer = {
  id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  company_id: string
  cpf: string | null
  cnpj: string | null
  legal_name: string | null
  trade_name: string | null
  state_registration: string | null
  full_name: string | null
  birth_date: string | null
  occupation: string | null
  address_id: string | null
  referral: string | null
  phone: string | null
  mobile: string | null
  email: string | null
  customer_code: string | null
  credit_limit: number | null
  outstanding_balance: number | null
  status_id: number
  marital_status_id: number | null
  person_type: string
}

/** Resposta da API get_customers (RPC) */
export type GetCustomersResponse = {
  total: number
  limit: number
  offset: number
  data: CustomerFromAPI[]
}

/** Cliente como retornado pela API get_customers (com status e address aninhados) */
export type CustomerFromAPI = Omit<Customer, 'status_id' | 'address_id'> & {
  status?: { id: number; name: string }
  address?: { id?: string; city?: string; state?: string; street?: string; number?: string; zip_code?: string; neighbourhood?: string; additional_info?: string }
}

// ──────────────────────────── Contracts ────────────────────────────

export type Contract = {
  id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  company_id: string
  customer_id: string
  /** Fiador (cliente cadastrado). Opcional no tipo para compatibilidade antes da migration. */
  guarantor_customer_id?: string | null
  contract_number: string | null
  inclusion_date: string | null
  contract_amount: number | null
  installments_count: number
  admin_fee_rate: number | null
  interest_rate: number | null
  first_due_date: string | null
  total_amount: number | null
  installment_amount: number | null
  residual_amount: number | null
  total_installments: number | null
  bank: string | null
  contract_category_id: number
  contract_type_id: number
  status_id: number
  notes: string | null
}

/** Contrato com joins (retorno de get_contracts RPC ou queries com select expandido) */
export type ContractWithRelations = Contract & {
  customer?: {
    id: string
    full_name: string | null
    legal_name: string | null
    trade_name: string | null
    cpf: string | null
    cnpj: string | null
    person_type?: string
  } | null
  guarantor?: { id: string; full_name: string | null; cpf: string | null; cnpj: string | null } | null
  status?: { id: number; name: string } | null
  category?: { id: number; name: string } | null
  contract_type?: { id: number; name: string } | null
}

/** Resposta da RPC get_contracts */
export type GetContractsResponse = {
  total: number
  limit: number
  offset: number
  data: ContractWithRelations[]
}

// ──────────────────────────── Installments ─────────────────────────

export type ContractInstallment = {
  id: string
  contract_id: string
  company_id: string
  installment_number: number
  due_date: string
  amount: number
  amount_paid: number
  paid_at: string | null
  status_id: number
  origin_id: number | null
  notes: string | null
  deleted_at: string | null
}

// ──────────────────────────── Payments ─────────────────────────────

export type InstallmentPayment = {
  id: string
  company_id: string
  installment_id: string
  paid_amount: number
  paid_at: string
  payment_method_id: number
  received_by_user_id: string | null
  reference: string | null
  notes: string | null
  created_at: string
}

// ──────────────────────────── Lookup tables ────────────────────────

export type LookupRow = {
  id: number
  name: string
}

export type ContractCategory = LookupRow
export type ContractType = LookupRow
export type ContractStatus = LookupRow
export type InstallmentStatus = LookupRow
export type InstallmentOrigin = LookupRow
export type PaymentMethod = LookupRow
export type CustomerStatus = LookupRow
export type MaritalStatus = LookupRow
export type CustomerFileType = LookupRow
export type ContractFileType = LookupRow

// ──────────────────────────── Files ───────────────────────────────

export type CustomerFile = {
  id: string
  company_id: string
  customer_id: string
  file_type_id: number
  file_url: string
  file_name: string | null
  notes: string | null
  created_at: string
  deleted_at: string | null
}

export type ContractFile = {
  id: string
  company_id: string
  contract_id: string
  file_type_id: number
  file_url: string
  file_name: string | null
  notes: string | null
  created_at: string
  deleted_at: string | null
}

// ──────────────────────────── Company / Users ─────────────────────

export type Company = {
  id: string
  name: string
  cnpj: string | null
  phone: string | null
  email: string | null
  created_at: string
}

export type CompanyUser = {
  id: string
  company_id: string
  user_id: string | null
  name: string | null
  email: string | null
  role: string | null
  photo_user: string | null
  is_active: boolean
  created_at: string
}

// ──────────────────────────── Contas a pagar (company_expenses) ────────────────────────────

export type CompanyExpense = {
  id: string
  company_id: string
  payee_name: string
  amount: number
  due_date: string
  expense_type: string
  notes: string | null
  title: string | null
  contact_name: string | null
  payment_date: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}
