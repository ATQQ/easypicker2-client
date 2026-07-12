import type { FindOneOptions } from 'typeorm'
import { Provide } from 'flash-wolves'
import { AppDataSource, BaseRepository } from '.'
import { PaymentOrder as PaymentOrderEntity } from './entity'

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

  /** 查询单条订单并加悲观写锁，用于 notify 回调幂等处理 */
  async findOneWithLock(where: FindOneOptions<PaymentOrderEntity>['where']): Promise<PaymentOrderEntity | null> {
    return this.repository
      .createQueryBuilder(this.entityName)
      .setLock('pessimistic_write')
      .where(where)
      .getOne()
  }
}
