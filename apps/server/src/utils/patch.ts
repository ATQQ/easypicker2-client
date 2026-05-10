import type { UserConfigType } from '@/db/model/config'
import type { GlobalSiteConfig } from '@/types'
import { appendFile } from 'node:fs/promises'
import process from 'node:process'
import {
  mongodbConfig,
  mysqlConfig,
  qiniuConfig,
  redisConfig,
  txConfig,
} from '@/config'
import { initTypeORM } from '@/db'
import { refreshMongoDb } from '@/lib/dbConnect/mongodb'
import { refreshPool } from '@/lib/dbConnect/mysql'
import { isMysqlAutoSyncSchemaOnStartup } from '@/utils/mysql-features'
import {
  applyMysqlCanonicalSchemaAdds,
  applyMysqlCanonicalSchemaModifies,
} from '@/utils/mysql-schema-canonical'
import { refreshQinNiuConfig } from './qiniuUtil'
import { getUniqueKey } from './stringUtil'

import { refreshTxConfig } from './tencent'
import LocalUserDB from './user-local-db'

export async function runMysqlPatchesOnStartup(): Promise<void> {
  if (!isMysqlAutoSyncSchemaOnStartup()) {
    console.log('[mysql:migrate] 启动时跳过（autoSyncSchemaOnStartup=false），可在管理面板检查并一键对齐表结构')
    return
  }
  await patchTable({ applyAdds: true, applyMods: true })
}

/**
 * docs/schema/mysql-schema.json ：缺列 ADD、列类型漂移 MODIFY。
 */
export async function patchTable(options?: {
  applyAdds?: boolean
  applyMods?: boolean
}): Promise<{ added: string[], modified: string[] }> {
  const applyAdds = options?.applyAdds !== false
  const applyMods = options?.applyMods !== false

  const added = applyAdds ? await applyMysqlCanonicalSchemaAdds() : []
  const modified = applyMods ? await applyMysqlCanonicalSchemaModifies() : []

  if (!added.length && !modified.length) {
    console.log('[mysql:migrate] mysql-schema.json 与当前库一致（无 ADD COLUMN / MODIFY COLUMN）')
  }
  else {
    if (added.length)
      console.log(`[mysql:migrate] 已变更：ADD COLUMN → ${added.join(', ')}`)
    if (modified.length)
      console.log(`[mysql:migrate] 已变更：MODIFY COLUMN → ${modified.join(', ')}`)
  }

  return { added, modified }
}

function getRandomUser() {
  const key = getUniqueKey()
  return `ep${key.slice(18, key.length)}`
}

function getRandomPassword() {
  const key = getUniqueKey()
  return key.slice(10, 18)
}

export async function initUserConfig() {
  // 创建1个单独可配置服务的用户
  let userAccount = LocalUserDB.findUserConfig({
    type: 'server',
    key: 'USER',
  })?.[0]?.value
  let userPWD = LocalUserDB.findUserConfig({ type: 'server', key: 'PWD' })?.[0]
    ?.value
  if (!userAccount || !userPWD) {
    userAccount = getRandomUser()
    userPWD = getRandomPassword()
    LocalUserDB.addUserConfigData({
      type: 'server',
      key: 'USER',
      value: userAccount,
      isSecret: true,
    })
    LocalUserDB.addUserConfigData({
      type: 'server',
      key: 'PWD',
      value: userPWD,
      isSecret: true,
    })
  }
  // 打印日志
  console.log('!!! 服务管理面板!!! ', '账号:', userAccount, '密码:', userPWD)
  console.log('!!! 服务管理面板!!! ', '账号:', userAccount, '密码:', userPWD)
  console.log('!!! 服务管理面板!!! ', '账号:', userAccount, '密码:', userPWD)

  const storeDbInfo = (type: UserConfigType, config: Record<string, any>) => {
    const configList = LocalUserDB.findUserConfig({ type }) || []
    Object.keys(config).forEach((key) => {
      if (!configList.some(item => item.key === key)) {
        // 添加默认兜底配置
        console.log(`[LocalUserDB] 添加默认配置 ${type}.${key}=${config[key]}`)
        LocalUserDB.addUserConfigData({
          type,
          key,
          value: config[key],
          isSecret: ['password', 'secretKey'].includes(key),
        })
      }

      if (config[key] instanceof Object) {
        const oldConfig: any = configList.find(
          item => item.key === key,
        )?.value
        // 判断是否有新key不存在
        if (Object.keys(config[key]).some(k => oldConfig?.[k] === undefined)) {
          const newValue = {
            ...config[key],
            ...oldConfig,
          }
          console.log(
            `[LocalUserDB] 更新配置 ${type}.${key}=${JSON.stringify(newValue)}`,
          )
          LocalUserDB.updateUserConfig(
            {
              type,
              key,
            },
            {
              value: newValue,
            },
          )
        }
      }
    })
  }
  storeDbInfo('mysql', {
    ...mysqlConfig,
    autoCreateDatabase: false,
    autoSyncSchemaOnStartup: true,
  })
  storeDbInfo('mongo', mongodbConfig)
  storeDbInfo('redis', redisConfig)
  storeDbInfo('qiniu', qiniuConfig)
  storeDbInfo('tx', txConfig)
  storeDbInfo('smtp', {
    host: '',
    port: 465,
    secure: true,
    user: '',
    pass: '',
    fromAddress: '',
    fromName: 'EasyPicker',
  })
  storeDbInfo('global', {
    site: {
      maxInputLength: 20, // 最大输入长度
      openPraise: false, // 是否开启赞赏相关提示文案
      formLength: 10, // 表单项数量
      downloadOneExpired: 1, // 单个文件链接下载过期时间（min）
      downloadCompressExpired: 60, // 归档文件下载过期时间（min）
      compressSizeLimit: 10, // TODO: 压缩文件大小限制（GB）
      needBindPhone: false, // 是否需要绑定手机号
      enableCodeLogin: false,
      enableEmailCodeLogin: false,
      needBindEmail: false,
      alertEmails: '',
      emailDailyLimit: 0,
      storageMode: 'qiniu' as 'qiniu' | 'local',
      maxUploadSizeMB: 500,
      limitSpace: false, // 是否限制空间
      limitWallet: false, // 是否限制钱包余额
      qiniuOSSPrice: 0.099, // 七牛云存储价格
      qiniuCDNPrice: 0.28, // 七牛云CDN价格
      qiniuBackhaulTrafficPrice: 0.15, // 七牛云回源流量价格
      qiniuBackhaulTrafficPercentage: 0.8, // 七牛云回源流量占比
      qiniuCompressPrice: 0.05, // 七牛云压缩价格
      moneyStartDay: +new Date('2024-06-01'), // 开始计算日期
      appName: '轻取', // 应用名称
      filePagePraiseText: '如果你觉得应用不错，',
      filePagePraiseLinkText: '给他发电⚡',
      filePagePraiseLink: 'http://docs.ep.sugarat.top/praise/index.html',
      filePageContactText: '，其它问题',
      filePageContactLinkText: '联系作者🔗',
      filePageContactLink: 'https://docs.ep.sugarat.top/author.html#%E8%81%94%E7%B3%BB%E4%BD%9C%E8%80%85',
      filePageFloatingContactEnabled: false,
      filePageLimitText: '由于部分用户用量较大，小站无法承担这笔开销，限制每个账户为 2GB 可用空间，2￥的默认余额',
      filePageSponsorText: '你可以通过',
      filePageSponsorLinkText: ' 联系作者进行赞助⚡ ',
      filePageSponsorLink: 'https://docs.ep.sugarat.top/author.html#%E8%81%94%E7%B3%BB%E4%BD%9C%E8%80%85',
      filePageSponsorSuffix: '调整空间 和 可用余额',
      filePageSelfHostLinkText: '也可以选择自己搭建💡',
      filePageSelfHostLink: 'https://docs.ep.sugarat.top/',
      feedbackEntryEnabled: true,
    } as GlobalSiteConfig,
  })
  // 更新配置
  await LocalUserDB.updateCfg()
  // 写入本地环境变量文件
  await LocalUserDB.updateLocalEnv()
}

/**
 * 从本地配置文件 user-config 取出数据库与第三方服务所需配置
 */
export function readyServerDepService() {
  // TODO: 使用上有缺陷，需要重新设计
  return Promise.all([
    initTokenUtil(),
    // 1. MySQL
    initTypeORM(),
    refreshPool(),
    // 2. qiniu
    refreshQinNiuConfig(),
    // 4 mongodb
    refreshMongoDb(),
    // 5. tx
    refreshTxConfig(),
  ])

  // 大多数情况下不需要额外配置
  // 3. redis
}

export function initTokenUtil() {
  if (!process.env.TOKEN_PREFIX) {
    // 生成一个随机的前缀
    const prefix = Math.random().toString(36).slice(2, 8)
    process.env.TOKEN_PREFIX = `ep-token-${prefix}`
    appendFile('.env.local', `\nTOKEN_PREFIX=${process.env.TOKEN_PREFIX}`)
  }
}
