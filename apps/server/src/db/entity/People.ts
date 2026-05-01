import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity('people')
export class People {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number

  @Column('varchar', { length: 128, name: 'task_key', comment: '关联任务id' })
  taskKey: string

  @Column('int', { name: 'user_id', comment: '所属用户id' })
  userId: number

  @Column('varchar', { length: 128, nullable: true, comment: '人员姓名' })
  name: string | null

  @Column('tinyint', { comment: '是否提交', default: 0 })
  status: number

  @Column('timestamp', {
    comment: '最后提交时间',
    name: 'submit_date',
    default: () => 'CURRENT_TIMESTAMP'
  })
  submitDate: Date

  @Column('int', {
    name: 'submit_count',
    default: 0,
    comment: '提交次数'
  })
  submitCount: number
}
