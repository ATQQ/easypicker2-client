import ajax from '../ajax'

export type MaskMode = 'none' | 'head1' | 'tail4' | 'mask_all'

export interface ViewVisibleField {
  name: string
  mask: MaskMode
}

export interface TaskViewMeta {
  enabled: boolean
  name: string
  ddl: string | null
  needPassword: boolean
  showUnsubmitted: boolean
  showFileNames: boolean
  limitPeople: boolean
  visibleFields: ViewVisibleField[]
  bindField: string | null
}

export interface TaskViewSubmittedRow {
  people: string
  submitAt: string | null
  fileCount: number
  fileNames?: string[]
  maskedFields: { name: string, value: string }[]
}

export interface TaskViewProgress {
  name: string
  ddl: string | null
  limitPeople: boolean
  showUnsubmitted: boolean
  showFileNames: boolean
  submitted: TaskViewSubmittedRow[]
  unsubmitted?: string[]
  submittedCount: number
  totalPeople?: number
}

export interface ViewConfig {
  viewEnabled: boolean
  viewPassword: string
  viewVisibleFields: string
  viewShowUnsubmitted: boolean
  viewShowFileNames: boolean
}

function getMeta(key: string) {
  return ajax.get<unknown, TaskViewMeta>(`public/task-view/${key}`, {
    withCredentials: true,
  })
}

function verify(key: string, password: string) {
  return ajax.post<unknown, { ok: boolean, taskName: string }>(
    `public/task-view/${key}/verify`,
    { password },
    { withCredentials: true },
  )
}

function getProgress(key: string) {
  return ajax.get<unknown, TaskViewProgress>(
    `public/task-view/${key}/progress`,
    { withCredentials: true },
  )
}

function getViewConfig(key: string) {
  return ajax.get<unknown, ViewConfig>(`task_info/view-config/${key}`)
}

export default {
  getMeta,
  verify,
  getProgress,
  getViewConfig,
}
