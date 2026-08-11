import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('payment_order')
export class PaymentOrder {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true, comment: '主键自增' })
  id: string

  @Column('varchar', { length: 64, name: 'out_trade_no', comment: '本地订单号' })
  outTradeNo: string

  @Column('int', { name: 'user_id', comment: '所属用户id' })
  userId: number

  @Column('varchar', { length: 16, default: 'alipay', comment: '支付渠道' })
  channel: string

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '订单金额(元)' })
  amount: string

  @Column('varchar', {
    length: 16,
    default: 'pending',
    comment: '订单状态: pending/paid/closed/refunded',
  })
  status: string

  @Column('varchar', { length: 64, nullable: true, name: 'trade_no', comment: '支付宝交易号' })
  tradeNo: string | null

  @Column('varchar', { length: 128, nullable: true, comment: '订单标题' })
  subject: string | null

  @Column('text', { nullable: true, name: 'raw_notify', comment: '最近一次 notify 原始报文(JSON)' })
  rawNotify: string | null

  @Column('timestamp', { nullable: true, name: 'paid_time', comment: '支付成功时间' })
  paidTime: Date | null

  @Column('timestamp', {
    default: () => 'CURRENT_TIMESTAMP',
    name: 'create_time',
    comment: '创建时间',
  })
  createTime: Date

  @Column('timestamp', {
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    name: 'update_time',
    comment: '更新时间',
  })
  updateTime: Date
}
