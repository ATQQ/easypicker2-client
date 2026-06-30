import type { MaskMode } from './maskUtil'

export interface ViewVisibleField {
  name: string
  mask: MaskMode
}

export interface ViewRosterConfig {
  enabled: boolean
  columns: string[]
  nameMask: MaskMode
  showUnsubmitted: boolean
}

export interface ViewConfig {
  password: string
  visibleFields: ViewVisibleField[]
  roster: ViewRosterConfig
}

export const DEFAULT_VIEW_CONFIG: ViewConfig = {
  password: '',
  visibleFields: [],
  roster: {
    enabled: false,
    columns: [],
    nameMask: 'head_tail',
    showUnsubmitted: true,
  },
}

const VALID_MASKS: MaskMode[] = ['none', 'head1', 'head_tail', 'tail']

function normalizeMask(mask: unknown, fallback: MaskMode): MaskMode {
  if (typeof mask === 'string' && (VALID_MASKS as string[]).includes(mask)) {
    return mask as MaskMode
  }
  return fallback
}

function normalizeVisibleFields(input: unknown): ViewVisibleField[] {
  if (!Array.isArray(input)) {
    return []
  }
  const out: ViewVisibleField[] = []
  for (const item of input) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const name = (item as Record<string, unknown>).name
    if (typeof name !== 'string' || name === '') {
      continue
    }
    out.push({
      name,
      mask: normalizeMask((item as Record<string, unknown>).mask, 'tail'),
    })
  }
  return out
}

function normalizeRoster(input: unknown): ViewRosterConfig {
  const base = { ...DEFAULT_VIEW_CONFIG.roster }
  if (!input || typeof input !== 'object') {
    return base
  }
  const r = input as Record<string, unknown>
  return {
    enabled: r.enabled === true,
    columns: Array.isArray(r.columns)
      ? r.columns.filter((c): c is string => typeof c === 'string')
      : [],
    nameMask: normalizeMask(r.nameMask, 'head_tail'),
    showUnsubmitted: r.showUnsubmitted === undefined ? true : r.showUnsubmitted === true,
  }
}

export function parseViewConfig(raw: string | null | undefined): ViewConfig {
  if (!raw) {
    return { ...DEFAULT_VIEW_CONFIG, roster: { ...DEFAULT_VIEW_CONFIG.roster } }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  }
  catch {
    return { ...DEFAULT_VIEW_CONFIG, roster: { ...DEFAULT_VIEW_CONFIG.roster } }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ...DEFAULT_VIEW_CONFIG, roster: { ...DEFAULT_VIEW_CONFIG.roster } }
  }
  const obj = parsed as Record<string, unknown>
  return {
    password: typeof obj.password === 'string' ? obj.password : '',
    visibleFields: normalizeVisibleFields(obj.visibleFields),
    roster: normalizeRoster(obj.roster),
  }
}

export function stringifyViewConfig(config: ViewConfig): string {
  return JSON.stringify(config)
}
