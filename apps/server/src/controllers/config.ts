import { Get, Put, ReqBody, ReqQuery, RouterController } from 'flash-wolves'
import { USER_POWER } from '@/db/model/user'
import { getRedisStatus } from '@/lib/dbConnect/redis'
import { getMongoDBStatus, refreshMongoDb } from '@/lib/dbConnect/mongodb'
import { getTxServiceStatus, refreshTxConfig } from '@/utils/tencent'
import { getMysqlStatus, refreshPool } from '@/lib/dbConnect/mysql'
import { getQiniuStatus, refreshQinNiuConfig } from '@/utils/qiniuUtil'
import type { UserConfig } from '@/db/model/config'
import { UserConfigLabels } from '@/constants'
import LocalUserDB from '@/utils/user-local-db'
import { initTypeORM } from '@/db'
import { patchTable } from '@/utils/patch'
import type { GlobalSiteConfig } from '@/types'

@RouterController('config', { userPower: USER_POWER.SYSTEM, needLogin: true })
export default class UserController {
  @Get('service/overview')
  async getServiceStatus() {
    const data = await Promise.all([
      getQiniuStatus(),
      getTxServiceStatus(),
      getRedisStatus(),
      getMysqlStatus(),
      getMongoDBStatus(),
    ])

    const result = data.reduce((pre, cur) => {
      const { type, ...rest } = cur
      pre[type] = rest
      return pre
    }, {})
    return result
  }

  cleanUserConfig(cfg: UserConfig[]) {
    return cfg.map((v) => {
      const { key, isSecret, value, type } = v
      return {
        key,
        value: isSecret ? '******' : value,
        type,
        label: UserConfigLabels[type][key],
      }
    })
  }

  @Get('service/config')
  async getUserConfig() {
    const tx = this.cleanUserConfig(
      LocalUserDB.findUserConfig({
        type: 'tx',
      }),
    )

    const mysql = this.cleanUserConfig(
      LocalUserDB.findUserConfig({
        type: 'mysql',
      }),
    )

    const qiniu = this.cleanUserConfig(
      LocalUserDB.findUserConfig({
        type: 'qiniu',
      }),
    )

    const mongo = this.cleanUserConfig(
      LocalUserDB.findUserConfig({
        type: 'mongo',
      }),
    )

    return [
      { title: 'MySQL', data: mysql },
      { title: 'MongoDB', data: mongo },
      { title: '七牛云', data: qiniu },
      { title: '腾讯云', data: tx },
    ]
  }

  @Put('service/config')
  async updateUserConfig(@ReqBody() data: Partial<UserConfig>) {
    const wrapperValue = (key: string, v: any) => {
      const num = ['port']
      const bool = ['auth']
      const boolString = ['imageCoverStyle', 'imagePreviewStyle']
      if (num.includes(key)) {
        return +v
      }
      if (bool.includes(key)) {
        return String(true) === v
      }
      if (boolString.includes(key)) {
        return String(false) === v ? '' : v
      }
      return v
    }
    await LocalUserDB.updateUserConfig(
      {
        type: data.type,
        key: data.key,
      },
      {
        value: wrapperValue(data.key, data.value),
      },
    )
    if (data.type === 'mysql') {
      await refreshPool()
      try {
        await initTypeORM()
        await patchTable()
      }
      catch (error) {
        // empty
      }
    }
    if (data.type === 'qiniu') {
      await refreshQinNiuConfig()
    }
    if (data.type === 'tx') {
      await refreshTxConfig()
    }
    if (data.type === 'mongo') {
      await refreshMongoDb()
    }
    await LocalUserDB.updateLocalEnv()
  }

  @Get('global', { needLogin: false, userPower: null })
  async getGlobalConfig(@ReqQuery('type') key = 'site') {
    const globalConfig = LocalUserDB.findUserConfig({
      type: 'global',
      key,
    })
    const filterKey: (keyof GlobalSiteConfig)[] = ['maxInputLength', 'openPraise', 'formLength', 'compressSizeLimit', 'needBindPhone', 'limitSpace', 'limitWallet', 'moneyStartDay', 'appName']
    return filterKey.reduce((pre, cur) => {
      pre[cur] = globalConfig[0].value[cur]
      return pre
    }, {})
  }

  @Get('global/all', { userPower: USER_POWER.SUPER })
  async getAllGlobalConfig(@ReqQuery('type') key = 'site') {
    const globalConfig = LocalUserDB.findUserConfig({
      type: 'global',
      key,
    })
    return globalConfig[0].value
  }

  @Put('global', { userPower: USER_POWER.SUPER })
  async updateGlobalConfig(@ReqBody() data) {
    const { key, value } = data
    await LocalUserDB.updateUserConfig(
      {
        type: 'global',
        key,
      },
      {
        value,
      },
    )
  }
}
