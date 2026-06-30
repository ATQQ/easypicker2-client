import type { BOOLEAN } from './public'

export interface TaskInfo {
  id?: number
  user_id?: number
  userId?: number
  task_key?: string
  taskKey?: string
  template?: string
  rewrite?: BOOLEAN
  format?: string
  info?: unknown
  ddl?: Date
  share_key?: string
  shareKey?: string
  limit_people?: BOOLEAN
  limitPeople?: BOOLEAN
  bind_field?: string
  bindField?: string
  tip?: string
  submit_password?: string | null
  submitPassword?: string | null
  view_enabled?: BOOLEAN
  viewEnabled?: BOOLEAN
  view_config?: string | null
  viewConfig?: string | null
}
