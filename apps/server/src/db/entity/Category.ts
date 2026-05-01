import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity('category')
export class Category {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true, comment: '主键自增' })
  id: number

  @Column('varchar', { length: 256, comment: '分类名称' })
  name: string

  @Column('int', { name: 'user_id', comment: '所属用户' })
  userId: number

  @Column('varchar', {
    length: 128,
    comment: '分类唯一标识'
  })
  k: string

  // @Column('tinyint', { default: 0 })
  // del: number
}
