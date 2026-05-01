import { getRedisValueJSON } from '@/db/redisDb'
import { getOSSFiles } from '@/utils/qiniuUtil'
import LocalUserDB from '@/utils/user-local-db'

class SuperService {
  async getOssFiles() {
    const systemUser = LocalUserDB.getUserConfigByType('server').USER || 'local'
    const cacheKey = `${systemUser}-oss-files-easypicker2/`

    // redis做一层缓存
    const ossFiles = await getRedisValueJSON<Qiniu.ItemInfo[]>(
      cacheKey,
      [],
      () => getOSSFiles('easypicker2/')
    )
    return ossFiles
  }

  async getOssFilesByPrefix(prefix: string) {
    if (!prefix) {
      return
    }
    const systemUser = LocalUserDB.getUserConfigByType('server').USER || 'local'
    const cacheKey = `${systemUser}-oss-files-${prefix}`

    // redis做一层缓存
    const ossFiles = await getRedisValueJSON<Qiniu.ItemInfo[]>(
      cacheKey,
      [],
      () => getOSSFiles(prefix)
    )
    return ossFiles
  }
}

export default new SuperService()
