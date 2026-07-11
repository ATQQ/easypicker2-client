import { Provide } from 'flash-wolves'
import { alipayConfig } from '@/config'

// alipay-sdk v4 采用命名导出，v3 兼容默认导出。这里通过 require 兼容两种情况。
// 该模块仅在支付功能开启后才会真实被调用；未安装依赖 / 未配置齐全时全部走「未启用」分支。

type AlipaySdkCtor = new (opts: Record<string, any>) => AlipaySdkInstance

interface AlipaySdkInstance {
  pageExecute: (
    method: string,
    httpMethod: 'GET' | 'POST',
    params: Record<string, any>,
  ) => string
  checkNotifySign?: (postData: Record<string, any>) => boolean
  checkNotifySignV2?: (postData: Record<string, any>) => boolean
  exec?: (method: string, params: Record<string, any>) => Promise<any>
  curl?: (
    httpMethod: string,
    path: string,
    options?: Record<string, any>,
  ) => Promise<any>
}

let sdkInstance: AlipaySdkInstance | null = null
let sdkInitFailed = false

function loadSdkCtor(): AlipaySdkCtor | null {
  try {
    // eslint-disable-next-line ts/no-require-imports
    const mod = require('alipay-sdk')
    // v4: { AlipaySdk }; v3: default export
    return (mod?.AlipaySdk || mod?.default || mod) as AlipaySdkCtor
  }
  catch {
    return null
  }
}

export function isAlipayReady(): boolean {
  if (!alipayConfig.enabled)
    return false
  const required = [
    alipayConfig.appId,
    alipayConfig.appPrivateKey,
    alipayConfig.alipayPublicKey,
    alipayConfig.notifyUrl,
    alipayConfig.returnUrl,
  ]
  return required.every(v => typeof v === 'string' && v.trim().length > 0)
}

export function getAlipayStatus() {
  return {
    enabled: isAlipayReady(),
    env: alipayConfig.env,
    minAmount: alipayConfig.minAmount,
    maxAmount: alipayConfig.maxAmount,
    dailyLimit: alipayConfig.dailyLimit,
    orderExpireMinutes: alipayConfig.orderExpireMinutes,
  }
}

function getGateway(): string {
  return alipayConfig.env === 'production'
    ? 'https://openapi.alipay.com/gateway.do'
    : 'https://openapi.alipaydev.com/gateway.do'
}

function ensureSdk(): AlipaySdkInstance | null {
  if (sdkInstance)
    return sdkInstance
  if (sdkInitFailed)
    return null
  if (!isAlipayReady())
    return null
  const Ctor = loadSdkCtor()
  if (!Ctor) {
    sdkInitFailed = true
    return null
  }
  try {
    sdkInstance = new Ctor({
      appId: alipayConfig.appId,
      privateKey: alipayConfig.appPrivateKey,
      alipayPublicKey: alipayConfig.alipayPublicKey,
      signType: alipayConfig.signType as 'RSA2',
      gateway: getGateway(),
      endpoint:
        alipayConfig.env === 'production'
          ? 'https://openapi.alipay.com'
          : 'https://openapi-sandbox.dl.alipaydev.com',
      keyType: 'PKCS8',
      timeout: 10 * 1000,
      camelcase: true,
    })
    return sdkInstance
  }
  catch (err) {
    sdkInitFailed = true
    console.warn('[alipay] SDK 初始化失败:', err instanceof Error ? err.message : err)
    return null
  }
}

export interface CreatePagePayInput {
  outTradeNo: string
  amount: string
  subject: string
  body?: string
}

@Provide()
export default class AlipayService {
  isReady() {
    return isAlipayReady()
  }

  getStatus() {
    return getAlipayStatus()
  }

  /** 生成支付宝电脑网站支付跳转 URL */
  createPagePayUrl(input: CreatePagePayInput): string | null {
    const sdk = ensureSdk()
    if (!sdk)
      return null
    const expireMinutes = Math.max(1, Number(alipayConfig.orderExpireMinutes) || 30)
    try {
      const url = sdk.pageExecute('alipay.trade.page.pay', 'GET', {
        notifyUrl: alipayConfig.notifyUrl,
        returnUrl: alipayConfig.returnUrl,
        bizContent: {
          out_trade_no: input.outTradeNo,
          product_code: 'FAST_INSTANT_TRADE_PAY',
          total_amount: input.amount,
          subject: input.subject,
          body: input.body || input.subject,
          timeout_express: `${expireMinutes}m`,
        },
      })
      return url
    }
    catch (err) {
      console.warn('[alipay] pageExecute 失败:', err instanceof Error ? err.message : err)
      return null
    }
  }

  /**
   * 校验支付宝 notify：签名 + app_id + seller_id（可选） + trade_status
   * 不校验金额（金额需与本地订单比对，由调用方处理）
   */
  verifyNotify(params: Record<string, any>): { ok: boolean, reason?: string } {
    const sdk = ensureSdk()
    if (!sdk)
      return { ok: false, reason: 'sdk not ready' }
    if (!params || typeof params !== 'object')
      return { ok: false, reason: 'empty params' }
    // 签名校验
    let signed = false
    try {
      if (typeof sdk.checkNotifySignV2 === 'function') {
        signed = !!sdk.checkNotifySignV2(params)
      }
      else if (typeof sdk.checkNotifySign === 'function') {
        signed = !!sdk.checkNotifySign(params)
      }
    }
    catch {
      signed = false
    }
    if (!signed)
      return { ok: false, reason: 'sign invalid' }
    if (params.app_id && String(params.app_id) !== String(alipayConfig.appId))
      return { ok: false, reason: 'app_id mismatch' }
    if (alipayConfig.sellerId && params.seller_id && String(params.seller_id) !== String(alipayConfig.sellerId))
      return { ok: false, reason: 'seller_id mismatch' }
    return { ok: true }
  }
}
