import type { UserConfig } from '@/db/model/config'
import type { GlobalSiteConfig } from '@/types'
import { Get, Put, ReqBody, ReqQuery, RouterController } from 'flash-wolves'
import { kvStoreConfig } from '@/config'
import { UserConfigLabels } from '@/constants'
import { initTypeORM } from '@/db'
import { USER_POWER } from '@/db/model/user'
import { getMongoDBStatus, refreshMongoDb } from '@/lib/dbConnect/mongodb'
import { getMysqlStatus, refreshPool } from '@/lib/dbConnect/mysql'
import { getRedisStatus } from '@/lib/dbConnect/redis'
import { patchTable } from '@/utils/patch'
import { getQiniuStatus, refreshQinNiuConfig } from '@/utils/qiniuUtil'
import { isCodeLoginSupported } from '@/utils/siteConfig'
import { getTxServiceStatus, refreshTxConfig } from '@/utils/tencent'
import LocalUserDB from '@/utils/user-local-db'

type ServiceConfigType = Extract<UserConfig['type'], 'mysql' | 'mongo' | 'redis' | 'qiniu' | 'tx'>

interface ServiceDefinition {
  type: ServiceConfigType
  title: string
  description: string
  required: boolean
  enabled: () => boolean
  getStatus: () => Promise<ServiceStatus>
}

const serviceDefinitions: ServiceDefinition[] = [
  {
    type: 'mysql',
    title: 'MySQL',
    description: '核心业务数据存储',
    required: true,
    enabled: () => true,
    getStatus: getMysqlStatus,
  },
  {
    type: 'qiniu',
    title: '七牛云',
    description: '文件对象存储与下载',
    required: true,
    enabled: () => true,
    getStatus: getQiniuStatus,
  },
  {
    type: 'mongo',
    title: 'MongoDB',
    description: '可选的历史日志数据源',
    required: false,
    enabled: () => true,
    getStatus: getMongoDBStatus,
  },
  {
    type: 'tx',
    title: '腾讯云',
    description: '短信验证码服务',
    required: false,
    enabled: () => true,
    getStatus: getTxServiceStatus,
  },
  {
    type: 'redis',
    title: 'Redis',
    description: '可选的 KV 缓存存储',
    required: false,
    enabled: () => kvStoreConfig.driver === 'redis',
    getStatus: getRedisStatus,
  },
]

@RouterController('config', { userPower: USER_POWER.SYSTEM, needLogin: true })
export default class UserController {
  getActiveServices() {
    return serviceDefinitions.filter((service) => {
      const hasConfig = LocalUserDB.findUserConfig({
        type: service.type,
      }).length > 0
      return hasConfig && service.enabled()
    })
  }

  @Get('service/overview')
  async getServiceStatus() {
    const services = this.getActiveServices()
    return Promise.all(
      services.map(async (service) => {
        const status = await service.getStatus().catch((err) => {
          return {
            type: service.type === 'mongo' ? 'mongodb' : service.type,
            status: false,
            errMsg: err?.message || '服务状态检查失败',
          } as ServiceStatus
        })
        return {
          type: service.type,
          title: service.title,
          description: service.description,
          required: service.required,
          status: status.status,
          errMsg: status.errMsg,
        }
      }),
    )
  }

  cleanUserConfig(cfg: UserConfig[]) {
    return cfg.map((v) => {
      const { key, isSecret, value, type } = v
      return {
        key,
        value: isSecret ? '' : value,
        type,
        label: UserConfigLabels[type]?.[key] || key,
        isSecret,
      }
    })
  }

  @Get('service/config')
  async getUserConfig() {
    return this.getActiveServices().map((service) => {
      return {
        type: service.type,
        title: service.title,
        description: service.description,
        required: service.required,
        data: this.cleanUserConfig(
          LocalUserDB.findUserConfig({
            type: service.type,
          }),
        ),
      }
    }).filter(service => service.data.length > 0)
  }

  @Put('service/config')
  async updateUserConfig(@ReqBody() data: Partial<UserConfig> | Partial<UserConfig>[]) {
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
    const configs = (Array.isArray(data) ? data : [data])
      .filter(item => item.type && item.key)
      .map((item) => {
        const shouldKeepSecret = item.isSecret && ['', '******', undefined, null].includes(item.value as any)
        return {
          ...item,
          value: shouldKeepSecret ? undefined : wrapperValue(item.key, item.value),
        }
      })
      .filter(item => item.value !== undefined)

    await LocalUserDB.updateUserConfigs(configs)
    const changedTypes = new Set(configs.map(item => item.type))

    if (changedTypes.has('mysql')) {
      await refreshPool()
      try {
        await initTypeORM()
        await patchTable()
      }
      catch {
        // empty
      }
    }
    if (changedTypes.has('qiniu')) {
      await refreshQinNiuConfig()
    }
    if (changedTypes.has('tx')) {
      await refreshTxConfig()
    }
    if (changedTypes.has('mongo')) {
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
    const filterKey: (keyof GlobalSiteConfig)[] = [
      'maxInputLength',
      'openPraise',
      'formLength',
      'compressSizeLimit',
      'needBindPhone',
      'limitSpace',
      'limitWallet',
      'moneyStartDay',
      'appName',
      'filePagePraiseText',
      'filePagePraiseLinkText',
      'filePagePraiseLink',
      'filePageContactText',
      'filePageContactLinkText',
      'filePageContactLink',
      'filePageFloatingContactEnabled',
      'filePageLimitText',
      'filePageSponsorText',
      'filePageSponsorLinkText',
      'filePageSponsorLink',
      'filePageSponsorSuffix',
      'filePageSelfHostLinkText',
      'filePageSelfHostLink',
    ]
    const result: Partial<GlobalSiteConfig> = {
      supportCodeLogin: isCodeLoginSupported(),
    }
    filterKey.forEach((cur) => {
      result[cur] = globalConfig[0].value[cur] as never
    })
    return result
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
