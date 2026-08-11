import type { FindOneOptions } from 'typeorm'
import { Provide } from 'flash-wolves'
import { AppDataSource, BaseRepository } from '.'
import { PaymentOrder as PaymentOrderEntity, User as UserEntity } from './entity'

export type NotifyProcessResult
  = | { kind: 'not_found' }
    | { kind: 'amount_mismatch', local: string, remote: string }
    | { kind: 'already_paid' }
    | { kind: 'closed' }
    | { kind: 'paid', userId: number, amount: string, account: string, sizeDelta: number }
    | { kind: 'ignored' }

/** 0.2 元 = 1GB 存储空间，向下取整，不足 0.2 元不增长空间 */
export function calcStorageDelta(amountYuan: number): number {
  if (!Number.isFinite(amountYuan) || amountYuan < 0.2)
    return 0
  return Math.floor(amountYuan / 0.2)
}

@Provide()
export class PaymentOrderRepository extends BaseRepository<PaymentOrderEntity> {
  protected entityName = PaymentOrderEntity.name

  protected createRepository() {
    return AppDataSource.getRepository(PaymentOrderEntity)
  }

  /** 查询指定用户今日某渠道的已支付/待支付订单金额合计 */
  async sumAmountToday(userId: number, channel: string, today: Date): Promise<number> {
    const alias = this.entityName
    const result = await this.repository
      .createQueryBuilder(alias)
      .select(`SUM(${alias}.amount)`, 'total')
      .where(`${alias}.userId = :userId`, { userId })
      .andWhere(`${alias}.channel = :channel`, { channel })
      .andWhere(`${alias}.createTime >= :today`, { today })
      .andWhere(`${alias}.status NOT IN (:...exclude)`, { exclude: ['closed', 'refunded'] })
      .getRawOne<{ total: string | null }>()
    return Number(result?.total || 0)
  }

  /**
   * 在事务内悲观锁处理 notify：查单 → 校验 → 更新订单/钱包，保证并发幂等。
   * TypeORM 要求 pessimistic_write 必须在已开启的事务中使用。
   */
  async processNotifyInTransaction(input: {
    outTradeNo: string
    amount: string
    tradeNo: string
    eventType: string
    rawNotify: string | null
  }): Promise<NotifyProcessResult> {
    const { outTradeNo, amount, tradeNo, eventType, rawNotify } = input
    return AppDataSource.transaction(async (manager) => {
      const order = await manager
        .createQueryBuilder(PaymentOrderEntity, this.entityName)
        .setLock('pessimistic_write')
        .where({ outTradeNo } as FindOneOptions<PaymentOrderEntity>['where'])
        .getOne()

      if (!order)
        return { kind: 'not_found' }

      if (Number(order.amount) !== Number(amount)) {
        return {
          kind: 'amount_mismatch',
          local: String(order.amount),
          remote: String(amount),
        }
      }

      if (order.status === 'paid')
        return { kind: 'already_paid' }

      if (eventType === 'order.closed') {
        await manager.update(PaymentOrderEntity, { id: order.id }, { status: 'closed' })
        return { kind: 'closed' }
      }

      if (eventType === 'order.paid') {
        await manager.update(
          PaymentOrderEntity,
          { id: order.id },
          {
            status: 'paid',
            tradeNo: tradeNo || order.tradeNo,
            paidTime: new Date(),
            rawNotify,
          },
        )
        const delta = Number(order.amount || 0)
        const sizeDelta = calcStorageDelta(delta)
        const walletUpdate: any = { wallet: () => `wallet + ${delta.toFixed(2)}` }
        if (sizeDelta > 0) {
          walletUpdate.size = () => `size + ${sizeDelta}`
        }
        await manager
          .createQueryBuilder()
          .update(UserEntity)
          .set(walletUpdate)
          .where('id = :id', { id: order.userId })
          .execute()
        const user = await manager.findOne(UserEntity, { where: { id: order.userId } })
        return {
          kind: 'paid',
          userId: order.userId,
          amount: String(order.amount),
          account: user?.account || '',
          sizeDelta,
        }
      }

      return { kind: 'ignored' }
    })
  }
}
