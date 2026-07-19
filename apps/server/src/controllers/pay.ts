import type { Context, FWRequest } from 'flash-wolves'
import type { PaymentOrder as PaymentOrderEntity } from '@/db/entity/PaymentOrder'
import type { User as EntityUser } from '@/db/entity/User'
import { Buffer } from 'node:buffer'
import {
  Get,
  Inject,
  InjectCtx,
  Post,
  ReqBody,
  ReqParams,
  Response,
  RouterController,
} from 'flash-wolves'
import { alipayConfig } from '@/config'
import { addBehavior } from '@/db/logDb'
import { PaymentOrderRepository } from '@/db/paymentOrderDb'
import { ReqUserInfo } from '@/decorator'
import { AlipayService, FileService } from '@/service'
import { getUniqueKey } from '@/utils/stringUtil'

interface CreatePayInput {
  amount: number | string
  subject?: string
}

function normalizeAmount(input: unknown): string | null {
  const n = Number(input)
  if (!Number.isFinite(n))
    return null
  if (n <= 0)
    return null
  return n.toFixed(2)
}

@RouterController('pay')
export default class PayController {
  @InjectCtx()
  private ctx: Context

  @Inject(AlipayService)
  private alipayService: AlipayService

  @Inject(PaymentOrderRepository)
  private paymentOrderRepository: PaymentOrderRepository

  @Inject(FileService)
  private fileService: FileService

  /** 公开：返回支付宝支付启用与金额范围（前端渲染入口用） */
  @Get('alipay/status', { CORS: true })
  async getAlipayStatus() {
    return this.alipayService.getStatus()
  }

  /** 已登录：创建支付宝当面付订单，返回收款二维码字符串 */
  @Post('alipay/create', { needLogin: true })
  async createAlipayOrder(
    @ReqBody() body: CreatePayInput,
    @ReqUserInfo() userInfo: EntityUser,
    req: FWRequest,
  ) {
    if (!this.alipayService.isReady()) {
      return Response.fail(400, '支付宝支付未启用')
    }
    if (!userInfo?.id) {
      return Response.fail(401, '未登录')
    }
    const amount = normalizeAmount(body?.amount)
    if (!amount) {
      return Response.fail(400, '金额不合法')
    }
    const amountNum = Number(amount)
    if (amountNum < alipayConfig.minAmount) {
      return Response.fail(400, `单笔充值金额需 ≥ ${alipayConfig.minAmount} 元`)
    }
    if (amountNum > alipayConfig.maxAmount) {
      return Response.fail(400, `单笔充值金额需 ≤ ${alipayConfig.maxAmount} 元`)
    }
    if (alipayConfig.dailyLimit > 0) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const usedToday = await this.paymentOrderRepository.sumAmountToday(
        userInfo.id,
        'alipay',
        today,
      )
      if (usedToday + amountNum > alipayConfig.dailyLimit) {
        return Response.fail(400, `当日累计充值超出上限 ${alipayConfig.dailyLimit} 元`)
      }
    }

    const outTradeNo = `EP${Date.now()}${getUniqueKey().slice(0, 8)}`
    const subject = String(body?.subject || '').slice(0, 64) || 'EasyPicker 钱包充值'
    const order: Partial<PaymentOrderEntity> = {
      outTradeNo,
      userId: userInfo.id,
      channel: 'alipay',
      amount,
      status: 'pending',
      subject,
    }
    await this.paymentOrderRepository.insert(order as PaymentOrderEntity)

    const qrCode = await this.alipayService.createPrecreateQrCode({
      outTradeNo,
      amount,
      subject,
    })
    if (!qrCode) {
      return Response.fail(500, '生成收款二维码失败')
    }
    addBehavior(req, {
      module: 'pay',
      msg: `创建支付宝当面付订单 ${outTradeNo} 金额 ${amount}`,
      data: { outTradeNo, amount, userId: userInfo.id },
    })
    return {
      outTradeNo,
      amount,
      qrCode,
    }
  }

  /** 已登录：查询单笔订单（本地） */
  @Get('alipay/order/:outTradeNo', { needLogin: true })
  async getOrder(
    @ReqParams('outTradeNo') outTradeNo: string,
    @ReqUserInfo() userInfo: EntityUser,
  ) {
    if (!outTradeNo) {
      return Response.fail(400, '缺少 outTradeNo')
    }
    const order = await this.paymentOrderRepository.findOne({
      outTradeNo,
      userId: userInfo.id,
    } as any)
    if (!order) {
      return Response.fail(404, '订单不存在')
    }
    return {
      outTradeNo: order.outTradeNo,
      amount: order.amount,
      status: order.status,
      subject: order.subject,
      tradeNo: order.tradeNo,
      paidTime: order.paidTime,
      createTime: order.createTime,
    }
  }

  /** 已登录：查询当前用户订单列表（简单倒序，最多 50 条） */
  @Get('alipay/orders', { needLogin: true })
  async getOrders(@ReqUserInfo() userInfo: EntityUser) {
    const list = await this.paymentOrderRepository.findMany(
      { userId: userInfo.id, channel: 'alipay' } as any,
      { order: { createTime: 'DESC' as any }, take: 50 },
    )
    return {
      list: (list || []).map(o => ({
        outTradeNo: o.outTradeNo,
        amount: o.amount,
        status: o.status,
        subject: o.subject,
        tradeNo: o.tradeNo,
        paidTime: o.paidTime,
        createTime: o.createTime,
      })),
    }
  }

  /** alipay-service 中转平台 JSON 回调（免登录、application/json） */
  @Post('alipay/notify', { CORS: false })
  async notify(req: FWRequest) {
    const res = this.ctx.res
    const writePlain = (text: string, code = 200) => {
      if (res.headersSent)
        return
      res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(text)
    }

    // rawBody 用 flash-wolves body parser 写入的 req.buffer（原始字节），不能 JSON.stringify(req.body)
    const rawBuf = (req as any).buffer
    const rawBody = Buffer.isBuffer(rawBuf)
      ? rawBuf.toString('utf8')
      : (typeof rawBuf === 'string' ? rawBuf : '')
    let payload: Record<string, any> = {}
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      payload = req.body as Record<string, any>
    }
    else if (rawBody) {
      try {
        payload = JSON.parse(rawBody)
      }
      catch (err) {
        console.warn('[alipay:notify] parse json failed:', err instanceof Error ? err.message : err)
        writePlain('fail')
        return
      }
    }

    const eventType = String(payload?.eventType || '')
    const bizOutTradeNo = String(payload?.bizOutTradeNo || '')
    const remoteOutTradeNo = String(payload?.outTradeNo || '')
    const tradeNo = String(payload?.tradeNo || '')
    const amount = String(payload?.amount ?? '')

    console.warn(
      `[alipay:notify] handler start event=${eventType} bizOutTradeNo=${bizOutTradeNo} remoteOutTradeNo=${remoteOutTradeNo} tradeNo=${tradeNo} amount=${amount}`,
    )
    addBehavior(req, {
      module: 'pay',
      msg: `支付宝 notify 到达 ${bizOutTradeNo}`,
      data: {
        eventType,
        bizOutTradeNo,
        remoteOutTradeNo,
        tradeNo,
        amount,
        raw: (() => {
          try {
            return rawBody.slice(0, 4000)
          }
          catch {
            return ''
          }
        })(),
      },
    })

    if (!this.alipayService.isReady()) {
      console.warn('[alipay:notify] service not ready, reply fail')
      writePlain('fail')
      return
    }

    // HMAC 验签
    const verify = this.alipayService.verifyIncomingNotify(req.headers as any, rawBody)
    if (!verify.ok) {
      console.warn(`[alipay:notify] verify failed reason=${verify.reason} bizOutTradeNo=${bizOutTradeNo}`)
      addBehavior(req, {
        module: 'pay',
        msg: `支付宝 notify 验签失败: ${verify.reason}`,
        data: { bizOutTradeNo, reason: verify.reason },
      })
      writePlain('fail', 401)
      return
    }

    if (!bizOutTradeNo) {
      console.warn('[alipay:notify] missing bizOutTradeNo, reply fail')
      writePlain('fail')
      return
    }

    const outTradeNo = bizOutTradeNo
    const rawNotify = (() => {
      try {
        return rawBody.slice(0, 4000)
      }
      catch {
        return null
      }
    })()

    try {
      const result = await this.paymentOrderRepository.processNotifyInTransaction({
        outTradeNo,
        amount,
        tradeNo,
        eventType,
        rawNotify,
      })

      if (result.kind === 'not_found') {
        console.warn(`[alipay:notify] order not found ${outTradeNo}`)
        addBehavior(req, {
          module: 'pay',
          msg: `支付宝 notify 订单不存在 ${outTradeNo}`,
          data: { outTradeNo, tradeNo, eventType, amount },
        })
        writePlain('fail')
        return
      }

      if (result.kind === 'amount_mismatch') {
        console.warn(`[alipay:notify] amount mismatch ${outTradeNo} local=${result.local} remote=${result.remote}`)
        addBehavior(req, {
          module: 'pay',
          msg: `支付宝 notify 金额不一致 ${outTradeNo}`,
          data: { local: result.local, remote: result.remote },
        })
        writePlain('fail')
        return
      }

      if (result.kind === 'already_paid') {
        console.warn(`[alipay:notify] order already paid, idempotent ${outTradeNo}`)
        writePlain('success')
        return
      }

      if (result.kind === 'closed') {
        console.warn(`[alipay:notify] trade closed ${outTradeNo} trade_no=${tradeNo}`)
        addBehavior(req, {
          module: 'pay',
          msg: `支付宝订单关闭 ${outTradeNo}`,
          data: { outTradeNo, tradeNo },
        })
        writePlain('success')
        return
      }

      if (result.kind === 'paid') {
        // 入账后立刻失效 overview 缓存，避免 usage 接口长时间返回旧 wallet
        await this.fileService.expireUserOverviewCache(result.userId)
        console.warn(`[alipay:notify] trade success ${outTradeNo} user=${result.account} userId=${result.userId} delta=${result.amount} trade_no=${tradeNo}`)
        addBehavior(req, {
          module: 'pay',
          msg: `支付宝充值到账 ${outTradeNo} 用户${result.account} 金额 ${result.amount}`,
          data: { outTradeNo, userId: result.userId, delta: result.amount, tradeNo },
        })
        writePlain('success')
        return
      }

      // ignored：其他事件类型，记录但不改状态
      console.warn(`[alipay:notify] unhandled eventType=${eventType} ${outTradeNo}, keep pending`)
      addBehavior(req, {
        module: 'pay',
        msg: `支付宝 notify 未处理事件 ${eventType} ${outTradeNo}`,
        data: { outTradeNo, tradeNo, eventType, amount },
      })
      writePlain('success')
    }
    catch (err) {
      console.warn(
        `[alipay:notify] process failed ${outTradeNo}:`,
        err instanceof Error ? err.message : err,
      )
      addBehavior(req, {
        module: 'pay',
        msg: `支付宝 notify 处理异常 ${outTradeNo}`,
        data: {
          outTradeNo,
          tradeNo,
          eventType,
          error: err instanceof Error ? err.message : String(err),
        },
      })
      writePlain('fail')
    }
  }
}
