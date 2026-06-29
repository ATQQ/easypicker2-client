import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('task_info')
export class TaskInfo {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number

  @Column('int', { name: 'user_id', comment: '关联user_id' })
  userId: number

  @Column('varchar', {
    length: 256,
    name: 'task_key',
    comment: '关联任务的key',
  })
  taskKey: string

  @Column('varchar', { length: 1024, nullable: true, comment: '模板文件名称' })
  template: string | null

  @Column('tinyint', { comment: '自动重命名', default: 0 })
  rewrite: number

  @Column('varchar', { length: 1024, nullable: true, comment: '文件名格式' })
  format: string | null

  @Column({ type: 'json', nullable: true, comment: '提交必填的内容(表单结构 JSON)' })
  info: unknown

  @Column('timestamp', { nullable: true, comment: '截止日期' })
  ddl: Date | null

  @Column('varchar', {
    name: 'share_key',
    length: 128,
    comment:
      '任务对外分享用的短链 key（与 task.k 不同；公开分享页、接口鉴权等会用到）',
  })
  shareKey: string

  @Column('tinyint', {
    name: 'limit_people',
    comment: '是否限制提交人员',
    default: 0,
  })
  limitPeople: number

  @Column('varchar', {
    name: 'bind_field',
    length: 255,
    comment: '绑定表单项',
    default: '姓名',
  })
  bindField: string

  @Column({
    type: 'text',
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
    comment: '批注信息（含 emoji，须 utf8mb4）',
  })
  tip: string

  @Column('varchar', {
    name: 'submit_password',
    length: 64,
    nullable: true,
    comment: '提交密码（为空表示未开启）',
  })
  submitPassword: string | null

  @Column('tinyint', {
    name: 'view_enabled',
    comment: '是否开启实时查看页（只读分享）',
    default: 0,
  })
  viewEnabled: number

  @Column('varchar', {
    name: 'view_password',
    length: 64,
    nullable: true,
    comment: '查看页访问密码（为空表示无需密码）',
  })
  viewPassword: string | null

  @Column({
    type: 'text',
    name: 'view_visible_fields',
    nullable: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
    comment: '查看页可见字段及脱敏配置 JSON：{fields:[{name,mask}]}',
  })
  viewVisibleFields: string | null

  @Column('tinyint', {
    name: 'view_show_unsubmitted',
    comment: '查看页是否展示未提交人员名单（仅 limit_people=1 时生效）',
    default: 1,
  })
  viewShowUnsubmitted: number

  @Column('tinyint', {
    name: 'view_show_file_names',
    comment: '查看页是否展示文件名（默认仅显示文件数）',
    default: 0,
  })
  viewShowFileNames: number
}
