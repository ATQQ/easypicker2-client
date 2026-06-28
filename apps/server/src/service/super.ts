import { expiredRedisKey, getRedisValueJSON } from '@/db/redisDb'
import { getFileKeys, getOSSFiles } from '@/utils/qiniuUtil'
import { isLocalStorageMode } from '@/utils/storageMode'
import LocalUserDB from '@/utils/user-local-db'

class SuperService {
  private getSystemUser() {
    return LocalUserDB.getUserConfigByType('server').USER || 'local'
  }

  private ossFilesCacheKey(prefix: string) {
    return `${this.getSystemUser()}-oss-files-${prefix}`
  }

  private fileKeysCacheKey(prefix: string) {
    return `${this.getSystemUser()}-file-keys-${prefix}`
  }

  async expireOssFilesCache(prefix: string) {
    if (isLocalStorageMode() || !prefix) {
      return
    }
    await expiredRedisKey(this.ossFilesCacheKey(prefix))
  }

  async expireFileKeysCache(prefix: string) {
    if (isLocalStorageMode() || !prefix) {
      return
    }
    await expiredRedisKey(this.fileKeysCacheKey(prefix))
  }

  /** 清理七牛对象后失效常用列表缓存 */
  async expireDefaultOssListCaches() {
    await this.expireOssFilesCache('easypicker2/')
    await this.expireFileKeysCache('easypicker2/temp_package')
    await this.expireFileKeysCache('1')
  }

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
