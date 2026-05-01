import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('files')
export class Files {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number

  @Column('varchar', { length: 256, name: 'task_key', comment: '所属任务' })
  taskKey: string

  @Column('varchar', {
    length: 256,
    name: 'task_name',
    comment: '提交时的任务名称',
  })
  taskName: string

  @Column('varchar', { length: 256, name: 'category_key', comment: '所属分类' })
  categoryKey: string

  @Column('int', { name: 'user_id', comment: '所属用户' })
  userId: number

  @Column('varchar', { length: 1024, name: 'name', comment: '文件名' })
  name: string

  @Column('varchar', { length: 10240, nullable: true, comment: '文件信息' })
  info: string | null

  @Column('varchar', { length: 512, comment: '文件hash' })
  hash: string

  @Column('timestamp', {
    comment: '上传日期',
    default: () => 'CURRENT_TIMESTAMP',
  })
  date: Date

  @Column('bigint', { comment: '文件大小' })
  size: number

  @Column('varchar', { length: 256, nullable: true, comment: '人员姓名' })
  people: string | null

  @Column('varchar', {
    length: 1024,
    default: '',
    name: 'origin_name',
    comment: '原文件名',
  })
  originName: string

  @Column('tinyint', { default: 0, comment: '是否删除' })
  del: number

  @Column('timestamp', { name: 'oss_del_time', nullable: true, comment: 'OSS删除时间' })
  ossDelTime: Date | null

  @Column('timestamp', { name: 'del_time', nullable: true, comment: '删除时间' })
  delTime: Date | null

  @UpdateDateColumn({ name: 'last_update_time', comment: '最后更新时间' })
  lastUpdateTime: Date
}
