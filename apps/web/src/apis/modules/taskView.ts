import ajax from '../ajax'

export type MaskMode = 'none' | 'head1' | 'head_tail' | 'tail'

export interface ViewVisibleField {
  name: string
  mask: MaskMode
}

export interface RosterConfig {
  enabled: boolean
  columns: string[]
  nameMask: MaskMode
  showUnsubmitted: boolean
}

export interface ViewFileFieldConfig {
  visible: boolean
  mask: MaskMode
}

export interface ViewFileSizeFieldConfig {
  visible: boolean
}

export interface ViewFileFieldsConfig {
  fileName: ViewFileFieldConfig
  originName: ViewFileFieldConfig
  size: ViewFileSizeFieldConfig
}

export interface ViewConfig {
  password: string
  visibleFields: ViewVisibleField[]
  roster: RosterConfig
  fileFields: ViewFileFieldsConfig
}

export interface TaskViewMeta {
  enabled: boolean
  name: string
  ddl?: string | null
  needPassword?: boolean
  bindField?: string | null
  roster?: {
    enabled: boolean
    columns: string[]
    showUnsubmitted: boolean
  }
  fileFields?: ViewFileFieldsConfig
}

// 文件提交记录单行：结构对齐 POST /file/page 的 File 类型（脱敏后的 info 仍为数组）
// 注意：name / origin_name / size 由用户配置决定是否下发，前端需做存在性判断
export interface TaskViewSubmittedFile {
  id: number
  task_key: string
  task_name: string
  category_key: string
  user_id: number
  name?: string
  storage: string
  info: Array<{ text: string, value: string }>
  hash: string
  date: string | Date
  size?: number
  people: string
  origin_name?: string
}

export interface TaskViewSubmittedProgress {
  tab: 'submitted'
  pageIndex: number
  pageSize: number
  total: number
  pageCount: number
  files: TaskViewSubmittedFile[]
}

// 人员提交情况单行：结构对齐 GET /people/:key 返回的 People 类型（不含慢查询字段）
export interface TaskViewRosterPeople {
  id: number
  name: string
  status: 0 | 1 | boolean
  lastDate: string | Date | null
  count: number
}

export interface TaskViewRosterProgress {
  tab: 'roster'
  people: TaskViewRosterPeople[]
}

export type TaskViewProgress = TaskViewSubmittedProgress | TaskViewRosterProgress

export interface OwnerViewConfigResponse {
  viewEnabled: boolean
  viewConfig: ViewConfig
}

function getMeta(key: string) {
  return ajax.get<unknown, TaskViewMeta>(`public/task-view/${key}`)
}

function verify(key: string, password: string) {
  return ajax.post<unknown, { ok: boolean, taskName: string }>(
    `public/task-view/${key}/verify`,
    { password },
  )
}

function getProgress(
  key: string,
  options: {
    tab: 'submitted' | 'roster'
    pageIndex: number
    pageSize: number
    password?: string
  },
) {
  const params: Record<string, string | number> = {
    tab: options.tab,
    pageIndex: options.pageIndex,
    pageSize: options.pageSize,
  }
  if (options.password)
    params.password = options.password
  return ajax.get<unknown, TaskViewProgress>(
    `public/task-view/${key}/progress`,
    { params },
  )
}

function getViewConfig(key: string) {
  return ajax.get<unknown, OwnerViewConfigResponse>(`task_info/view-config/${key}`)
}

export default {
  getMeta,
  verify,
  getProgress,
  getViewConfig,
}
