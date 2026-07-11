import type { Context, FWRequest } from 'flash-wolves'
import type { ServerResponse } from 'node:http'
import type { PaymentOrder as PaymentOrderEntity } from '@/db/entity/PaymentOrder'
import type { User as EntityUser } from '@/db/entity/User'
import {
  Get,
  Inject,
  InjectCtx,
  Post,
  ReqBody,
  ReqParams,
  ReqQuery,
  ReqUserInfo,
  Response,
  RouterController,
} from 'flash-wolves'
import { alipayConfig } from '@/config'
import { addBehavior } from '@/db/logDb'
import { PaymentOrderRepository } from '@/db/paymentOrderDb'
import { UserRepository } from '@/db/userDb'
import { AlipayService } from '@/service'
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

function htmlRedirect(res: ServerResponse, url: string) {
  const safe = String(url).replace(/"/g, '&quot;')
  res.writeHead(302, {
    'Content-Type': 'text/html; charset=utf-8',
    'Location': safe,
  })
  res.end(`<html><head><meta http-equiv="refresh" content="0;url=${safe}"/></head><body>redirecting...</body></html>`)
}

@RouterController('pay')
export default class PayController {
  @InjectCtx()
  private ctx: Context

  @Inject(AlipayService)
  private alipayService: AlipayService

  @Inject(PaymentOrderRepository)
  private paymentOrderRepository: PaymentOrderRepository

  @Inject(UserRepository)
  private userRepository: UserRepository

  /** 公开：返回支付宝支付启用与金额范围（前端渲染入口用） */
  @Get('alipay/status', { CORS: true })
  async getAlipayStatus() {
    return this.alipayService.getStatus()
  }

  /** 已登录：创建支付宝网站支付订单，返回跳转 URL */
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
      const todayOrders = await this.paymentOrderRepository.findMany({
        userId: userInfo.id,
        channel: 'alipay',
      } as any)
      const usedToday = (todayOrders || [])
        .filter(o => o.createTime && new Date(o.createTime as any) >= today && o.status !== 'closed')
        .reduce((sum, o) => sum + Number(o.amount || 0), 0)
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

    const payUrl = this.alipayService.createPagePayUrl({
      outTradeNo,
      amount,
      subject,
    })
    if (!payUrl) {
      return Response.fail(500, '生成支付链接失败')
    }
    addBehavior(req, {
      module: 'pay',
      msg: `创建支付宝订单 ${outTradeNo} 金额 ${amount}`,
      data: { outTradeNo, amount, userId: userInfo.id },
    })
    return {
      outTradeNo,
      amount,
      payUrl,
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

  /** 支付宝异步通知（免登录、form-urlencoded）：body 由 serverInterceptor 预解析 */
  @Post('alipay/notify', { CORS: false })
  async notify(req: FWRequest) {
    const res = this.ctx.res
    const writePlain = (text: string) => {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(text)
    }
    if (!this.alipayService.isReady()) {
      writePlain('fail')
      return
    }
    const params: Record<string, string>
      = (req as any)._alipayNotifyBody || {}
    const verify = this.alipayService.verifyNotify(params)
    if (!verify.ok) {
      addBehavior(req, {
        module: 'pay',
        msg: `支付宝 notify 验签失败: ${verify.reason}`,
        data: { outTradeNo: params.out_trade_no || '', reason: verify.reason },
      })
      writePlain('fail')
      return
    }
    const outTradeNo = String(params.out_trade_no || '')
    const tradeStatus = String(params.trade_status || '')
    const totalAmount = String(params.total_amount || '')
    const tradeNo = String(params.trade_no || '')
    if (!outTradeNo) {
      writePlain('fail')
      return
    }
    const order = await this.paymentOrderRepository.findOne({ outTradeNo } as any)
    if (!order) {
      writePlain('fail')
      return
    }
    // 金额比对
    if (Number(order.amount) !== Number(totalAmount)) {
      addBehavior(req, {
        module: 'pay',
        msg: `支付宝 notify 金额不一致 ${outTradeNo}`,
        data: { local: order.amount, remote: totalAmount },
      })
      writePlain('fail')
      return
    }
    // 已处理（幂等）
    if (order.status === 'paid') {
      writePlain('success')
      return
    }
    if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
      order.status = 'paid'
      order.tradeNo = tradeNo || order.tradeNo
      order.paidTime = new Date()
      try {
        order.rawNotify = JSON.stringify(params).slice(0, 4000)
      }
      catch {
        order.rawNotify = null
      }
      await this.paymentOrderRepository.update(order as PaymentOrderEntity)

      // 给用户钱包充值
      const user = await this.userRepository.findOne({ id: order.userId } as any)
      if (user) {
        const oldWallet = Number(user.wallet || 0)
        const newWallet = oldWallet + Number(order.amount || 0)
        user.wallet = newWallet.toFixed(2)
        await this.userRepository.update(user)
        addBehavior(req, {
          module: 'pay',
          msg: `支付宝充值到账 ${outTradeNo} 用户${user.account} ${oldWallet} => ${newWallet}`,
          data: { outTradeNo, userId: user.id, delta: order.amount, tradeNo },
        })
      }
      writePlain('success')
      return
    }
    // 其他状态：记录 raw、维持 pending
    try {
      order.rawNotify = JSON.stringify(params).slice(0, 4000)
      await this.paymentOrderRepository.update(order as PaymentOrderEntity)
    }
    catch { /* ignore */ }
    writePlain('success')
  }

  /**
   * 支付宝同步跳转：从 return_url 转到前端页面
   * 前端页面可通过 outTradeNo 轮询订单状态。
   */
  @Get('alipay/return', { CORS: true })
  async pageReturn(@ReqQuery() query: any) {
    const res = this.ctx.res
    const outTradeNo = String(query?.out_trade_no || '')
    const referer = this.ctx.req.headers.referer || ''
    // 默认跳转到 profile 页
    const origin = referer ? new URL(referer).origin : ''
    const target = `${origin || ''}/dashboard/profile?pay=alipay&outTradeNo=${encodeURIComponent(outTradeNo)}`
    htmlRedirect(res, target)
  }
}
