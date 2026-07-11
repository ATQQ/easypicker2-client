export type PaymentOrderStatus = 'pending' | 'paid' | 'closed' | 'refunded'

export interface PaymentOrder {
  id?: string
  outTradeNo?: string
  userId?: number
  channel?: string
  amount?: string
  status?: PaymentOrderStatus
  tradeNo?: string | null
  subject?: string | null
  rawNotify?: string | null
  paidTime?: Date | null
  createTime?: Date
  updateTime?: Date
}
