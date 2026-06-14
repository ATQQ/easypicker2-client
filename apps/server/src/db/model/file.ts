export interface File {
  id?: number
  task_key?: string
  taskKey?: string
  task_name?: string
  taskName?: string
  category_key?: string
  categoryKey?: string
  user_id?: number
  userId?: number
  name?: string
  info?: unknown
  hash?: string
  date?: Date
  size?: number
  people?: string
  originName?: string
  origin_name?: string
  storage?: 'qiniu' | 'local'
  del?: number
  ossDelTime?: Date
  oss_del_time?: Date
  delTime?: Date
  del_time?: Date
  lastUpdateTime?: Date
  last_update_time?: Date
}
