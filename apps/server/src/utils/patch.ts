import { appendFile } from 'node:fs/promises'
import process from 'node:process'
import { getUniqueKey } from './stringUtil'
import { refreshQinNiuConfig } from './qiniuUtil'
import { refreshTxConfig } from './tencent'
import LocalUserDB from './user-local-db'
import type { Category } from '@/db/model/category'
import type { File } from '@/db/model/file'
import type { TaskInfo } from '@/db/model/taskInfo'
import type { Task } from '@/db/model/task'
import type { People } from '@/db/model/people'
import type { User } from '@/db/model/user'
import { query, refreshPool } from '@/lib/dbConnect/mysql'
import type { UserConfigType } from '@/db/model/config'
import {
  mongodbConfig,
  mysqlConfig,
  qiniuConfig,
  redisConfig,
  txConfig,
} from '@/config'
import { refreshMongoDb } from '@/lib/dbConnect/mongodb'
import { initTypeORM } from '@/db'
import type { GlobalSiteConfig } from '@/types'

type TableName = 'task_info' | 'category' | 'files' | 'task' | 'people' | 'user'
interface DBTables {
  task_info: TaskInfo
  category: Category
  files: File
  task: Task
  people: People
  user: User
}

interface TableField<T extends TableName> {
  /**
   * 字段名
   */
  fieldName: keyof DBTables[T]
  /**
   * 字段类型
   */
  fieldType: string
  /**
   * 默认值
   */
  defaultValue: string | number
  /**
   * 字段释义
   */
  comment: string
  /**
   * 自动更新最后更新时间
   */
  lastUpdateTime?: boolean
}
async function addTableField<T extends TableName>(
  tableName: T,
  field: TableField<T>,
) {
  const cfg = LocalUserDB.getUserConfigByType('mysql')
  const dbName = cfg.database

  const { fieldName, defaultValue, comment, fieldType, lastUpdateTime = false } = field

  const checkFieldCountSql
    = 'SELECT count(*) as count FROM information_schema.COLUMNS WHERE table_name = ? AND column_name = ? AND table_schema = ?'
  const { count } = (
    await query(checkFieldCountSql, tableName, `${String(fieldName)}`, dbName)
  )[0]
  if (count === 0) {
    console.log(`添加字段 ${tableName}.${String(fieldName)}`)
    const sql = `ALTER TABLE ${tableName} ADD COLUMN ${String(
          fieldName,
        )} ${fieldType} DEFAULT ${defaultValue} ${lastUpdateTime ? 'ON UPDATE CURRENT_TIMESTAMP' : ''} COMMENT '${comment}'`
    console.log(sql)
    console.log(await query(sql))
  }
}

async function modifyTableField<T extends TableName>(
  tableName: T,
  field: Partial<TableField<T>>,
) {
  const cfg = LocalUserDB.getUserConfigByType('mysql')
  const dbName = cfg.database
  const { fieldName, fieldType } = field
  const checkFieldCountSql
    = 'SELECT count(*) as count FROM information_schema.COLUMNS WHERE table_name = ? AND column_name = ? AND table_schema = ?'
  const { count } = (
    await query(checkFieldCountSql, tableName, `${String(fieldName)}`, dbName)
  )[0]
  if (count === 0) {
    console.log('表', tableName, '不存在字段', fieldName, fieldType)
    return
  }

  const getColumnTypeSql
    = 'SELECT * FROM information_schema.COLUMNS WHERE table_name = ? AND column_name = ? AND table_schema = ?'
  const { COLUMN_TYPE: originType } = (
    await query(getColumnTypeSql, tableName, `${String(fieldName)}`, dbName)
  )[0]

  if (originType !== fieldType) {
    // TODO：特殊处理（待观测优化）
    if (fieldType === 'bigint' && originType.includes(fieldType)) {
      return
    }
    console.log(`修改字段 ${tableName}.${String(fieldName)}`)
    console.log(
      `ALTER TABLE ${tableName} MODIFY ${String(fieldName)} ${fieldType}`,
    )
    console.log(
      await query(
        `ALTER TABLE ${tableName} MODIFY ${String(fieldName)} ${fieldType}`,
      ),
    )
  }
}

export async function patchTable() {
  const TenK = Math.round(1024 * 10)
  await addTableField('task_info', {
    fieldName: 'tip',
    fieldType: 'text',
    comment: '批注信息',
    defaultValue: '',
  })

  await addTableField('files', {
    fieldName: 'origin_name',
    fieldType: 'varchar(1024)',
    comment: '原文件名',
    defaultValue: '',
  })

  await addTableField('task', {
    fieldName: 'del',
    fieldType: 'tinyint',
    comment: '是否删除',
    defaultValue: 0,
  })

  await addTableField('files', {
    fieldName: 'del',
    fieldType: 'tinyint',
    comment: '是否删除',
    defaultValue: 0,
  })

  await modifyTableField('task_info', {
    fieldName: 'info',
    fieldType: `varchar(${TenK})`,
  })

  await modifyTableField('files', {
    fieldName: 'info',
    fieldType: `varchar(${TenK})`,
  })

  await modifyTableField('task_info', {
    fieldName: 'tip',
    fieldType: 'text',
  })

  await modifyTableField('files', {
    fieldName: 'size',
    fieldType: 'bigint',
  })

  await addTableField('task_info', {
    fieldName: 'bind_field',
    fieldType: 'varchar(255)',
    defaultValue: '\'姓名\'',
    comment: '绑定表单字段',
  })

  await addTableField('user', {
    fieldName: 'size',
    fieldType: 'int',
    defaultValue: 2,
    comment: '可支配空间上限',
  })
  await addTableField('user', {
    fieldName: 'wallet',
    fieldType: 'decimal(10,2)',
    defaultValue: 2,
    comment: '钱包余额',
  })

  await addTableField('files', {
    fieldName: 'oss_del_time',
    fieldType: 'timestamp',
    defaultValue: null,
    comment: 'OSS资源删除时间',
  })
  await addTableField('files', {
    fieldName: 'del_time',
    fieldType: 'timestamp',
    defaultValue: null,
    comment: '删除时间',
  })
  await addTableField('files', {
    fieldName: 'last_update_time',
    fieldType: 'timestamp',
    defaultValue: 'CURRENT_TIMESTAMP',
    comment: '最后更新时间',
    lastUpdateTime: true,
  })
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
  storeDbInfo('mysql', mysqlConfig)
  storeDbInfo('mongo', mongodbConfig)
  storeDbInfo('redis', redisConfig)
  storeDbInfo('qiniu', qiniuConfig)
  storeDbInfo('tx', txConfig)
  storeDbInfo('global', {
    site: {
      maxInputLength: 20, // 最大输入长度
      openPraise: false, // 是否开启赞赏相关提示文案
      formLength: 10, // 表单项数量
      downloadOneExpired: 1, // 单个文件链接下载过期时间（min）
      downloadCompressExpired: 60, // 归档文件下载过期时间（min）
      compressSizeLimit: 10, // TODO: 压缩文件大小限制（GB）
      needBindPhone: false, // 是否需要绑定手机号
      limitSpace: false, // 是否限制空间
      limitWallet: false, // 是否限制钱包余额
      qiniuOSSPrice: 0.099, // 七牛云存储价格
      qiniuCDNPrice: 0.28, // 七牛云CDN价格
      qiniuBackhaulTrafficPrice: 0.15, // 七牛云回源流量价格
      qiniuBackhaulTrafficPercentage: 0.8, // 七牛云回源流量占比
      qiniuCompressPrice: 0.05, // 七牛云压缩价格
      moneyStartDay: +new Date('2024-06-01'), // 开始计算日期
      appName: '轻取', // 应用名称
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
