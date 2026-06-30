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

export interface ViewConfig {
  password: string
  visibleFields: ViewVisibleField[]
  roster: RosterConfig
}

export interface TaskViewMeta {
  enabled: boolean
  name: string
  ddl: string | null
  needPassword: boolean
  limitPeople: boolean
  bindField: string | null
  visibleFields: { name: string }[]
  roster: {
    enabled: boolean
    columns: string[]
    showUnsubmitted: boolean
  }
}

export interface TaskViewSubmittedRow {
  id: number
  people: string
  fileName: string
  submitDate: string | null
  fields: Record<string, string>
}

export interface TaskViewSubmittedProgress {
  tab: 'submitted'
  pageIndex: number
  pageSize: number
  total: number
  items: TaskViewSubmittedRow[]
  bindField: string
  visibleFieldNames: string[]
}

export interface TaskViewRosterRow {
  name: string
  status: boolean
  submitDate: string | null
}

export interface TaskViewRosterProgress {
  tab: 'roster'
  pageIndex: number
  pageSize: number
  total: number
  items: TaskViewRosterRow[]
}

export type TaskViewProgress = TaskViewSubmittedProgress | TaskViewRosterProgress

export interface OwnerViewConfigResponse {
  viewEnabled: boolean
  viewConfig: ViewConfig
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

function getProgress(
  key: string,
  options: { tab: 'submitted' | 'roster', pageIndex: number, pageSize: number },
) {
  return ajax.get<unknown, TaskViewProgress>(
    `public/task-view/${key}/progress`,
    {
      withCredentials: true,
      params: options,
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
