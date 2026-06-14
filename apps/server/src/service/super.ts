import { getRedisValueJSON } from '@/db/redisDb'
import { getFileKeys, getOSSFiles } from '@/utils/qiniuUtil'
import { isLocalStorageMode } from '@/utils/storageMode'
import LocalUserDB from '@/utils/user-local-db'

class SuperService {
  async getOssFiles() {
    if (isLocalStorageMode()) {
      return []
    }
    const systemUser = LocalUserDB.getUserConfigByType('server').USER || 'local'
    const cacheKey = `${systemUser}-oss-files-easypicker2/`

    // redis做一层缓存
    const ossFiles = await getRedisValueJSON<Qiniu.ItemInfo[]>(
      cacheKey,
      [],
      () => getOSSFiles('easypicker2/'),
    )
    return ossFiles
  }

  async getOssFilesByPrefix(prefix: string) {
    if (!prefix) {
      return
    }
    if (isLocalStorageMode()) {
      return []
    }
    const systemUser = LocalUserDB.getUserConfigByType('server').USER || 'local'
    const cacheKey = `${systemUser}-oss-files-${prefix}`

    // redis做一层缓存
    const ossFiles = await getRedisValueJSON<Qiniu.ItemInfo[]>(
      cacheKey,
      [],
      () => getOSSFiles(prefix),
    )
    return ossFiles
  }

  async getCachedFileKeys(prefix: string) {
    if (isLocalStorageMode()) {
      return []
    }
    const systemUser = LocalUserDB.getUserConfigByType('server').USER || 'local'
    const cacheKey = `${systemUser}-file-keys-${prefix}`

    const files = await getRedisValueJSON<Qiniu.ItemInfo[]>(
      cacheKey,
      [],
      () => getFileKeys(prefix),
    )
    return files
  }
}

export default new SuperService()
