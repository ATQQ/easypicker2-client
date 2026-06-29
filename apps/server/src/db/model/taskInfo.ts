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
  view_password?: string | null
  viewPassword?: string | null
  view_visible_fields?: string | null
  viewVisibleFields?: string | null
  view_show_unsubmitted?: BOOLEAN
  viewShowUnsubmitted?: BOOLEAN
  view_show_file_names?: BOOLEAN
  viewShowFileNames?: BOOLEAN
}
