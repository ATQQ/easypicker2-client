import LocalUserDB from '@/utils/user-local-db'

function boolFlag(record: Record<string, unknown>, key: string, defaultVal: boolean): boolean {
  const v = record[key]
  if (v === undefined || v === null)
    return defaultVal
  if (typeof v === 'boolean')
    return v
  const s = `${v}`
  if (s === 'false')
    return false
  if (s === 'true')
    return true
  return defaultVal
}

/** 是否在启动时创建库（若不存在）并初次导入 sql；默认关，便于在配置页保存时通过弹窗显式确认 */
export function isMysqlAutoCreateDatabase(): boolean {
  const cfg = LocalUserDB.getUserConfigByType('mysql') as Record<string, unknown>
  return boolFlag(cfg, 'autoCreateDatabase', false)
}

/** 是否在启动时自动执行增量列迁移与类型修正（参见 patchTable） */
export function isMysqlAutoSyncSchemaOnStartup(): boolean {
  const cfg = LocalUserDB.getUserConfigByType('mysql') as Record<string, unknown>
  return boolFlag(cfg, 'autoSyncSchemaOnStartup', true)
}
