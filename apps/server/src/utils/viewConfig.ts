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
  roster: ViewRosterConfig
  fileFields: ViewFileFieldsConfig
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
  fileFields: {
    fileName: { visible: true, mask: 'none' },
    originName: { visible: true, mask: 'none' },
    size: { visible: true },
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

function normalizeFileField(input: unknown, fallback: ViewFileFieldConfig): ViewFileFieldConfig {
  if (!input || typeof input !== 'object') {
    return { ...fallback }
  }
  const r = input as Record<string, unknown>
  return {
    visible: r.visible === undefined ? fallback.visible : r.visible === true,
    mask: normalizeMask(r.mask, fallback.mask),
  }
}

function normalizeFileSizeField(input: unknown, fallback: ViewFileSizeFieldConfig): ViewFileSizeFieldConfig {
  if (!input || typeof input !== 'object') {
    return { ...fallback }
  }
  const r = input as Record<string, unknown>
  return {
    visible: r.visible === undefined ? fallback.visible : r.visible === true,
  }
}

function normalizeFileFields(input: unknown): ViewFileFieldsConfig {
  const base = DEFAULT_VIEW_CONFIG.fileFields
  if (!input || typeof input !== 'object') {
    return {
      fileName: { ...base.fileName },
      originName: { ...base.originName },
      size: { ...base.size },
    }
  }
  const r = input as Record<string, unknown>
  return {
    fileName: normalizeFileField(r.fileName, base.fileName),
    originName: normalizeFileField(r.originName, base.originName),
    size: normalizeFileSizeField(r.size, base.size),
  }
}

export function parseViewConfig(raw: string | null | undefined): ViewConfig {
  const baseDefault = (): ViewConfig => ({
    ...DEFAULT_VIEW_CONFIG,
    roster: { ...DEFAULT_VIEW_CONFIG.roster },
    fileFields: {
      fileName: { ...DEFAULT_VIEW_CONFIG.fileFields.fileName },
      originName: { ...DEFAULT_VIEW_CONFIG.fileFields.originName },
      size: { ...DEFAULT_VIEW_CONFIG.fileFields.size },
    },
  })
  if (!raw) {
    return baseDefault()
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  }
  catch {
    return baseDefault()
  }
  if (!parsed || typeof parsed !== 'object') {
    return baseDefault()
  }
  const obj = parsed as Record<string, unknown>
  return {
    password: typeof obj.password === 'string' ? obj.password : '',
    visibleFields: normalizeVisibleFields(obj.visibleFields),
    roster: normalizeRoster(obj.roster),
    fileFields: normalizeFileFields(obj.fileFields),
  }
}

export function stringifyViewConfig(config: ViewConfig): string {
  return JSON.stringify(config)
}
