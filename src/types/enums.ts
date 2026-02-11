/** IDs das lookup tables do banco. Manter sincronizado com os seeds do Supabase. */

export const CONTRACT_STATUS = {
  DRAFT: 1,
  ACTIVE: 2,
  CLOSED: 3,
  CANCELED: 4,
} as const

export const CONTRACT_CATEGORY = {
  FINANCING: 1,
  LOAN: 2,
  CHECK_FINANCING: 3,
} as const

export const CONTRACT_TYPE = {
  PRICE: 1,
  SAC: 2,
} as const

export const INSTALLMENT_STATUS = {
  OPEN: 1,
  PARTIAL: 2,
  PAID: 3,
  OVERDUE: 4,
  CANCELED: 5,
  RENEGOTIATED: 6,
} as const

export const INSTALLMENT_ORIGIN = {
  CONTRACT: 1,
  RENEGOTIATION: 2,
  MANUAL: 3,
} as const

export const PAYMENT_METHOD = {
  CASH: 1,
  PIX: 2,
  BANK_TRANSFER: 3,
  CARD: 4,
  BOLETO: 5,
} as const

export const CUSTOMER_STATUS = {
  ACTIVE: 1,
  INACTIVE: 2,
  BLOCKED: 3,
} as const

export const MARITAL_STATUS = {
  SINGLE: 1,
  MARRIED: 2,
  DIVORCED: 3,
  WIDOWED: 4,
  SEPARATED: 5,
} as const

export type ContractStatusId = (typeof CONTRACT_STATUS)[keyof typeof CONTRACT_STATUS]
export type InstallmentStatusId = (typeof INSTALLMENT_STATUS)[keyof typeof INSTALLMENT_STATUS]
export type PaymentMethodId = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD]
export type CustomerStatusId = (typeof CUSTOMER_STATUS)[keyof typeof CUSTOMER_STATUS]
