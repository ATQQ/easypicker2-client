import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity('task')
export class Task {
  @PrimaryGeneratedColumn({ type: 'int', comment: '主键' })
  id: number

  @Column('int', { name: 'user_id', comment: '所属用户id' })
  userId: number

  @Column('varchar', {
    length: 128,
    name: 'category_key',
    comment: '关联分类key'
  })
  categoryKey: string

  @Column('varchar', { length: 256, comment: '任务名称' })
  name: string

  @Column('varchar', { length: 128, comment: '任务唯一标识' })
  k: string

  @Column('tinyint', { default: 0, comment: '是否删除' })
  del: number
}
