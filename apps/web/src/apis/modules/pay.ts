import ajax from '../ajax'

export interface AlipayStatus {
  enabled: boolean
  env: 'sandbox' | 'production'
  minAmount: number
  maxAmount: number
  dailyLimit: number
  orderExpireMinutes: number
}

export interface CreateAlipayOrderResult {
  outTradeNo: string
  amount: string
  qrCode: string
}

export interface AlipayOrder {
  outTradeNo: string
  amount: string
  status: 'pending' | 'paid' | 'closed' | 'refunded'
  subject: string | null
  tradeNo: string | null
  paidTime: string | null
  createTime: string
}

function getAlipayStatus() {
  return ajax.get('pay/alipay/status') as Promise<{
    code: number
    data: AlipayStatus
    msg: string
  }>
}

function createAlipayOrder(amount: number, subject?: string) {
  return ajax.post('pay/alipay/create', { amount, subject }) as Promise<{
    code: number
    data: CreateAlipayOrderResult
    msg: string
  }>
}

function getAlipayOrder(outTradeNo: string) {
  return ajax.get(`pay/alipay/order/${encodeURIComponent(outTradeNo)}`) as Promise<{
    code: number
    data: AlipayOrder
    msg: string
  }>
}

function getAlipayOrders() {
  return ajax.get('pay/alipay/orders') as Promise<{
    code: number
    data: { list: AlipayOrder[] }
    msg: string
  }>
}

export default {
  getAlipayStatus,
  createAlipayOrder,
  getAlipayOrder,
  getAlipayOrders,
}
