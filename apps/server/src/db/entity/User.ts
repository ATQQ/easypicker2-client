import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('user')
export class User {
  @PrimaryGeneratedColumn({ type: 'int', comment: '唯一标识' })
  id: number

  @Column('varchar', { length: 64, nullable: true, comment: '用于登录的账号' })
  account: string

  @Column('varchar', { length: 22, nullable: true, comment: '手机号' })
  phone: string

  @Column('varchar', { length: 256, comment: '密码' })
  password: string

  @Column('tinyint', { default: 6, comment: '账户权限' })
  power: number

  @Column('tinyint', { default: 0, comment: '账户状态' })
  status: number

  @Column('timestamp', {
    default: 'CURRENT_TIMESTAMP',
    comment: '注册时间',
    name: 'join_time',
  })
  joinTime: Date

  @Column('timestamp', {
    nullable: true,
    comment: '最后登录时间',
    name: 'login_time',
  })
  loginTime: Date

  @Column('int', { default: 1, comment: '登录次数', name: 'login_count' })
  loginCount: number

  @Column('timestamp', {
    nullable: true,
    comment: '解封时间',
    name: 'open_time',
  })
  openTime: Date

  @Column('int', { default: 2, comment: '可支配空间上限GB' })
  size: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  wallet: string

  @Column('varchar', { length: 128, nullable: true, comment: '邮箱' })
  email: string | null

  @Column('tinyint', {
    default: 0,
    name: 'email_verified',
    comment: '邮箱已验证',
  })
  emailVerified: number

  @Column('tinyint', {
    default: 0,
    name: 'notify_on_submit',
    comment: '新提交时邮件通知',
  })
  notifyOnSubmit: number
}
