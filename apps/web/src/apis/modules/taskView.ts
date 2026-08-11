import ajax from '../ajax'

export type MaskMode = 'none' | 'head1' | 'head_tail' | 'tail' | 'mask_all'

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

/** 公开页提交记录：仅白名单字段（不含 hash / storage / user_id 等） */
export interface TaskViewSubmittedFile {
  id: number
  task_name: string
  name?: string
  info: Array<{ text: string, value: string }>
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

export interface TaskViewRosterPeople {
  id: number
  name: string
  status?: 0 | 1 | boolean
  lastDate?: string | Date | null
  count?: number
}

export interface TaskViewRosterProgress {
  tab: 'roster'
  pageIndex: number
  pageSize: number
  total: number
  pageCount: number
  people: TaskViewRosterPeople[]
  columns: string[]
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
  },
) {
  return ajax.get<unknown, TaskViewProgress>(
    `public/task-view/${key}/progress`,
    {
      params: {
        tab: options.tab,
        pageIndex: options.pageIndex,
        pageSize: options.pageSize,
      },
    },
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
