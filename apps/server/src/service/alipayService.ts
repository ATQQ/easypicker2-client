import { Provide } from 'flash-wolves'
import { alipayConfig, alipayRelayConfig } from '@/config'
import { buildSignedHeaders, verifyIncoming } from '@/utils/openRelaySign'

export interface CreateOrderInput {
  outTradeNo: string
  amount: string
  subject: string
  body?: string
  payMethod?: 'page' | 'wap' | 'precreate'
  extra?: Record<string, any>
}

export interface CreateOrderResult {
  qrCode: string | null
  payUrl: string | null
  remoteOutTradeNo: string | null
  expireAt: string | null
}

export function isAlipayReady(): boolean {
  if (!alipayConfig.enabled)
    return false
  if (!alipayRelayConfig.enabled)
    return false
  return !!(
    alipayRelayConfig.baseUrl
    && alipayRelayConfig.appId
    && alipayRelayConfig.appSecret
  )
}

export function getAlipayStatus() {
  return {
    enabled: isAlipayReady(),
    env: 'relay',
    minAmount: alipayConfig.minAmount,
    maxAmount: alipayConfig.maxAmount,
    dailyLimit: alipayConfig.dailyLimit,
    orderExpireMinutes: alipayConfig.orderExpireMinutes,
  }
}

interface RelayRequestOptions {
  method: 'GET' | 'POST'
  path: string
  bodyRaw?: string
  timeoutMs?: number
}

async function callRelay<T = any>(opts: RelayRequestOptions): Promise<{ ok: boolean, data?: T, message?: string, status?: number }> {
  if (!isAlipayReady())
    return { ok: false, message: 'alipay relay not ready' }
  const url = `${alipayRelayConfig.baseUrl}${opts.path}`
  const bodyRaw = opts.bodyRaw ?? ''
  const headers = buildSignedHeaders(
    { method: opts.method, path: opts.path, bodyRaw },
    { appId: alipayRelayConfig.appId, appSecret: alipayRelayConfig.appSecret },
  )
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, opts.timeoutMs ?? alipayRelayConfig.timeoutMs))
  try {
    const res = await fetch(url, {
      method: opts.method,
      headers: {
        ...headers,
        ...(opts.method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      body: opts.method === 'POST' ? bodyRaw : undefined,
      signal: controller.signal,
    })
    const text = await res.text()
    let json: any = null
    try {
      json = text ? JSON.parse(text) : null
    }
    catch {
      json = null
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        message: json?.message || text || `http ${res.status}`,
      }
    }
    if (json && typeof json === 'object' && 'ok' in json) {
      if (json.ok)
        return { ok: true, data: json.data as T, status: res.status }
      return { ok: false, message: json.message || 'relay returned ok=false', status: res.status }
    }
    return { ok: true, data: (json ?? text) as T, status: res.status }
  }
  catch (err: any) {
    return { ok: false, message: err?.message || 'network error' }
  }
  finally {
    clearTimeout(timeout)
  }
}

@Provide()
export default class AlipayService {
  isReady() {
    return isAlipayReady()
  }

  getStatus() {
    return getAlipayStatus()
  }

  /**
   * 通过中转平台创建订单，默认使用当面付（precreate），返回二维码文本
   */
  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult | null> {
    if (!isAlipayReady())
      return null
    const payload = {
      bizOutTradeNo: input.outTradeNo,
      amount: input.amount,
      subject: input.subject,
      body: input.body || input.subject,
      payMethod: input.payMethod || 'precreate',
      extra: input.extra,
    }
    const bodyRaw = JSON.stringify(payload)
    const resp = await callRelay<any>({
      method: 'POST',
      path: '/api/open/order/create',
      bodyRaw,
    })
    if (!resp.ok) {
      console.warn('[alipay-relay] createOrder failed:', resp.status || '', resp.message || '')
      return null
    }
    const data = resp.data || {}
    return {
      qrCode: data.qrCode || null,
      payUrl: data.payUrl || null,
      remoteOutTradeNo: data.outTradeNo || null,
      expireAt: data.expireAt || null,
    }
  }

  /**
   * 兼容旧签名：仅返回二维码字符串，供 PayController 直接使用
   */
  async createPrecreateQrCode(input: { outTradeNo: string, amount: string, subject: string, body?: string }): Promise<string | null> {
    const r = await this.createOrder({
      outTradeNo: input.outTradeNo,
      amount: input.amount,
      subject: input.subject,
      body: input.body,
      payMethod: 'precreate',
    })
    return r?.qrCode || null
  }

  /**
   * 验签 alipay-service 透传过来的回调请求
   * @param headers 原始请求头（大小写不敏感）
   * @param bodyRaw 原始请求体字符串
   */
  verifyIncomingNotify(headers: Record<string, any>, bodyRaw: string): { ok: boolean, reason?: string } {
    if (!isAlipayReady())
      return { ok: false, reason: 'relay not ready' }
    return verifyIncoming(headers, bodyRaw, {
      appId: alipayRelayConfig.appId,
      appSecret: alipayRelayConfig.appSecret,
      path: alipayRelayConfig.notifyPath,
      method: 'POST',
    })
  }
}
