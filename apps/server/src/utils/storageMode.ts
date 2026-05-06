import LocalUserDB from '@/utils/user-local-db'

export type StorageMode = 'qiniu' | 'local'

export function getStorageMode(): StorageMode {
  const site = LocalUserDB.getSiteConfig()
  return site?.storageMode === 'local' ? 'local' : 'qiniu'
}

/** 单文件上传上限（字节），由站点配置 maxUploadSizeMB 控制 */
export function getMaxUploadBytes(): number {
  const site = LocalUserDB.getSiteConfig()
  const mb = site?.maxUploadSizeMB
  if (typeof mb !== 'number' || Number.isNaN(mb) || mb <= 0)
    return 500 * 1024 * 1024
  return Math.min(Math.floor(mb * 1024 * 1024), 50 * 1024 * 1024 * 1024)
}
