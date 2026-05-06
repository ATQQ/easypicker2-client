import type { Context } from 'flash-wolves'
import type { UserConfig } from '@/db/model/config'
import type { GlobalSiteConfig } from '@/types'
import { Get, Inject, InjectCtx, Post, Put, ReqBody, ReqQuery, RouterController } from 'flash-wolves'
import { In } from 'typeorm'
import { kvStoreConfig } from '@/config'
import { UserConfigLabels } from '@/constants'
import { initTypeORM } from '@/db'
import { USER_POWER } from '@/db/model/user'
import { UserRepository } from '@/db/userDb'
import { getMongoDBStatus, refreshMongoDb } from '@/lib/dbConnect/mongodb'
import { getMysqlStatus, refreshPool } from '@/lib/dbConnect/mysql'
import { getRedisStatus } from '@/lib/dbConnect/redis'
import { UserService } from '@/service'
import { ensureMysqlBootstrap } from '@/utils/mysql-bootstrap'
import { checkMysqlDatabaseExists } from '@/utils/mysql-check-database'
import {
  isMysqlAutoCreateDatabase,
  isMysqlAutoSyncSchemaOnStartup,
} from '@/utils/mysql-features'
import { getMysqlLiveIntrospection } from '@/utils/mysql-live-introspect'
import {
  getMysqlCanonicalSchemaDrift,
  getMysqlCanonicalSchemaExportSqlSafe,
} from '@/utils/mysql-schema-canonical'
import { patchTable } from '@/utils/patch'
import { getQiniuStatus, refreshQinNiuConfig } from '@/utils/qiniuUtil'
import { rPassword } from '@/utils/regExp'
import { isSmtpConfigured } from '@/utils/mail'
import { isCodeLoginSupported, isEmailCodeLoginSupported } from '@/utils/siteConfig'
import { encryption } from '@/utils/stringUtil'
import { getTxServiceStatus, refreshTxConfig } from '@/utils/tencent'
import LocalUserDB from '@/utils/user-local-db'

type ServiceConfigType = Extract<UserConfig['type'], 'mysql' | 'mongo' | 'redis' | 'qiniu' | 'tx' | 'smtp'>

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
    type: 'smtp',
    title: 'SMTP 邮件',
    description: '验证码、通知与告警邮件',
    required: false,
    enabled: () => true,
    getStatus: async () => ({
      type: 'smtp',
      status: isSmtpConfigured(),
      errMsg: isSmtpConfigured() ? undefined : '请填写 host、user、pass、fromAddress',
    }),
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
  @Inject(UserService)
  private userService!: UserService

  @Inject(UserRepository)
  private userRepository!: UserRepository

  @InjectCtx()
  private Ctx!: Context

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

  @Get('service/mysql/schema')
  async getMysqlSchemaOverview() {
    try {
      const drift = await getMysqlCanonicalSchemaDrift()
      return {
        autoCreateDatabase: isMysqlAutoCreateDatabase(),
        autoSyncSchemaOnStartup: isMysqlAutoSyncSchemaOnStartup(),
        ...drift,
      }
    }
    catch (err: unknown) {
      return {
        autoCreateDatabase: isMysqlAutoCreateDatabase(),
        autoSyncSchemaOnStartup: isMysqlAutoSyncSchemaOnStartup(),
        pending: false,
        missingTables: [],
        missingColumns: [] as Array<{ table: string, column: string }>,
        typeMismatches: [] as Array<{
          table: string
          column: string
          expectedComparable: string
          actualComparable: string
        }>,
        error:
          err instanceof Error ? err.message : '无法检查 schema，请确认 MySQL 已连接',
      }
    }
  }

  /** 检测能否连接实例、database 是否已创建、是否存在 user 表（不修改数据） */
  @Post('service/mysql/check-database')
  async checkMysqlDatabase(@ReqBody() body: Record<string, unknown>) {
    return checkMysqlDatabaseExists({
      host: body.host as string | undefined,
      port: body.port as number | string | undefined,
      user: body.user as string | undefined,
      password: body.password as string | undefined,
      database: body.database as string | undefined,
    })
  }

  /** 当前连接库的实时表结构（字段 / 索引 / 估算行数 / SHOW CREATE TABLE） */
  @Get('service/mysql/introspect')
  async getMysqlLiveIntrospect() {
    return getMysqlLiveIntrospection()
  }

  /** user 表中具备 SUPER / SYSTEM 的账号（与开放注册同一数据源） */
  @Get('service/admin-users')
  async listAdminUsers() {
    const users = await this.userRepository.findMany(
      { power: In([USER_POWER.SUPER, USER_POWER.SYSTEM]) },
      { order: { id: 'DESC' } },
    )
    const powerLabel = (p: number) => {
      if (p === USER_POWER.SUPER)
        return '超级管理员'
      if (p === USER_POWER.SYSTEM)
        return '系统管理员'
      return String(p)
    }
    const maskPhone = (p: string | null | undefined) => {
      if (!p)
        return ''
      if (p.length <= 7)
        return '****'
      return `${p.slice(0, 3)}****${p.slice(-4)}`
    }
    return {
      list: users.map(u => ({
        id: u.id,
        account: u.account,
        phoneMasked: maskPhone(u.phone),
        power: u.power,
        powerLabel: powerLabel(u.power),
        status: u.status,
        joinTime: u.joinTime ? new Date(u.joinTime).toISOString() : null,
        loginTime: u.loginTime ? new Date(u.loginTime).toISOString() : null,
      })),
    }
  }

  /**
   * 新增超级管理员：流程与开放注册 user/register 一致（不受「关闭注册」开关限制），写入后授予 SUPER；
   * 系统管理员与超级管理员可操作。
   */
  @Post('service/admin-users')
  async createAdminUser(@ReqBody() body: Record<string, unknown>) {
    const login = this.Ctx.req.userInfo as { power?: number } | undefined
    const loginPower = typeof login?.power === 'string' ? Number(login.power) : login?.power

    if (loginPower !== USER_POWER.SYSTEM && loginPower !== USER_POWER.SUPER) {
      return { ok: false, error: '无权创建（需系统管理员或超级管理员）' }
    }

    try {
      const user = await this.userService.register({
        account: body.account,
        pwd: body.pwd,
        bindPhone: body.bindPhone === true || `${body.bindPhone}` === 'true',
        phone: body.phone,
        code: body.code,
      })
      user.power = USER_POWER.SUPER
      await this.userRepository.update(user)
      return { ok: true, id: user.id }
    }
    catch (err: unknown) {
      const e = err as { msg?: string, message?: string }
      return { ok: false, error: e?.msg || e?.message || '创建失败' }
    }
  }

  /**
   * 重置列表内管理员（SUPER / SYSTEM）登录密码；系统管理员与超级管理员可操作。
   */
  @Post('service/admin-users/reset-password')
  async resetAdminUserPassword(@ReqBody() body: Record<string, unknown>) {
    const login = this.Ctx.req.userInfo as { power?: number } | undefined
    const loginPower = typeof login?.power === 'string' ? Number(login.power) : login?.power

    if (loginPower !== USER_POWER.SYSTEM && loginPower !== USER_POWER.SUPER) {
      return { ok: false, error: '无权重置（需系统管理员或超级管理员）' }
    }

    const rawId = body.id
    const id = typeof rawId === 'string' ? Number(rawId) : typeof rawId === 'number' ? rawId : Number.NaN
    const pwd = typeof body.pwd === 'string' ? body.pwd : ''

    if (!Number.isFinite(id) || id <= 0 || !rPassword.test(pwd)) {
      return { ok: false, error: '参数不合法' }
    }

    const target = await this.userRepository.findOne({ id })
    if (!target) {
      return { ok: false, error: '用户不存在' }
    }
    if (target.power !== USER_POWER.SUPER && target.power !== USER_POWER.SYSTEM) {
      return { ok: false, error: '该账号不在管理员范围内' }
    }

    target.password = encryption(pwd)
    await this.userRepository.update(target)
    return { ok: true }
  }

  /** 返回由 docs/schema/mysql-schema.json 拼装的可复制 DDL（建新库时使用） */
  @Get('service/mysql/schema/export-sql')
  async getMysqlSchemaExportSql() {
    try {
      return await getMysqlCanonicalSchemaExportSqlSafe()
    }
    catch (err: unknown) {
      return {
        sql: '',
        description: undefined,
        error:
          err instanceof Error
            ? err.message
            : '读取 mysql-schema.json 失败或服务端组装 SQL 出错',
      }
    }
  }

  /** 强制执行建库脚本（若启用）并应用 canonical JSON ADD + MODIFY */
  @Post('service/mysql/schema/apply')
  async applyMysqlSchemaManually() {
    await ensureMysqlBootstrap()
    await refreshPool()
    await initTypeORM()
    await patchTable({ applyAdds: true, applyMods: true })
    const drift = await getMysqlCanonicalSchemaDrift()
    return {
      ok: true,
      autoCreateDatabase: isMysqlAutoCreateDatabase(),
      autoSyncSchemaOnStartup: isMysqlAutoSyncSchemaOnStartup(),
      ...drift,
    }
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
      const bool = ['auth', 'autoCreateDatabase', 'autoSyncSchemaOnStartup']
      const boolString = ['imageCoverStyle', 'imagePreviewStyle']
      if (num.includes(key)) {
        return +v
      }
      if (bool.includes(key)) {
        return v === true || v === 'true' || v === 1 || `${v}` === '1'
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
      try {
        await ensureMysqlBootstrap()
      }
      catch (err: unknown) {
        console.warn(
          '[config] ensureMysqlBootstrap',
          err instanceof Error ? err.message : err,
        )
      }
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
      'feedbackEntryEnabled',
      'formLength',
      'compressSizeLimit',
      'downloadOneExpired',
      'downloadCompressExpired',
      'needBindPhone',
      'enableCodeLogin',
      'enableEmailCodeLogin',
      'limitSpace',
      'limitWallet',
      'storageMode',
      'maxUploadSizeMB',
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
      supportEmailCodeLogin: isEmailCodeLoginSupported(),
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
