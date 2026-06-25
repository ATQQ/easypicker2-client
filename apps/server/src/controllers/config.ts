import type { Context } from 'flash-wolves'
import type { UserConfig } from '@/db/model/config'
import type { GlobalSiteConfig } from '@/types'
import { Get, Inject, InjectCtx, Post, Put, ReqBody, ReqQuery, RouterController } from 'flash-wolves'
import { In } from 'typeorm'
import { kvStoreConfig } from '@/config'
import { uploadFileDir, UserConfigLabels } from '@/constants'
import { initTypeORM } from '@/db'
import { USER_POWER } from '@/db/model/user'
import { UserRepository } from '@/db/userDb'
import { getMongoDBStatus, refreshMongoDb } from '@/lib/dbConnect/mongodb'
import { getMysqlStatus, refreshPool } from '@/lib/dbConnect/mysql'
import { getRedisStatus } from '@/lib/dbConnect/redis'
import { FileService, UserService } from '@/service'
import { isSmtpConfigured, isSmtpServiceEnabled, sendMail, sendVerifyCodeMail } from '@/utils/mail'
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
import { rEmail, rPassword } from '@/utils/regExp'
import { isCodeLoginSupported, isEmailCodeLoginSupported, isTxMessageConfigured, isTxMessageEnabled } from '@/utils/siteConfig'
import { getStorageMode } from '@/utils/storageMode'
import { encryption } from '@/utils/stringUtil'
import { getTxServiceStatus, refreshTxConfig } from '@/utils/tencent'
import LocalUserDB from '@/utils/user-local-db'

type ServiceConfigType = Extract<UserConfig['type'], 'mysql' | 'mongo' | 'redis' | 'qiniu' | 'tx' | 'smtp'>
const billingConfigKeys: (keyof GlobalSiteConfig)[] = [
  'limitSpace',
  'limitWallet',
  'storageMode',
  'moneyStartDay',
  'qiniuOSSPrice',
  'qiniuCDNPrice',
  'qiniuBackhaulTrafficPrice',
  'qiniuBackhaulTrafficPercentage',
  'qiniuCompressPrice',
]

type GlobalConfigScope = 'auth' | 'shell' | 'form' | 'file-page' | 'site'

const GLOBAL_CONFIG_SCOPES: Record<Exclude<GlobalConfigScope, 'site'>, (keyof GlobalSiteConfig)[]> = {
  'auth': [
    'needBindPhone',
    'needBindEmail',
    'enableCodeLogin',
    'enableSmtp',
    'enableEmailCodeLogin',
  ],
  'shell': [
    'appName',
    'openPraise',
    'feedbackEntryEnabled',
    'announcementTop',
    'announcementModal',
  ],
  'form': [
    'maxInputLength',
    'formLength',
  ],
  'file-page': [
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
  ],
}

const GLOBAL_CONFIG_SITE_KEYS: (keyof GlobalSiteConfig)[] = Array.from(
  new Set<keyof GlobalSiteConfig>([
    ...GLOBAL_CONFIG_SCOPES.auth,
    ...GLOBAL_CONFIG_SCOPES.shell,
    ...GLOBAL_CONFIG_SCOPES.form,
    ...GLOBAL_CONFIG_SCOPES['file-page'],
  ]),
)

const GLOBAL_CONFIG_ACCOUNT_KEYS: (keyof GlobalSiteConfig)[] = [
  'storageMode',
  'limitSpace',
  'limitWallet',
  'moneyStartDay',
  'maxUploadSizeMB',
  'compressSizeLimit',
  'downloadOneExpired',
  'downloadCompressExpired',
]

interface ServiceDefinition {
  type: ServiceConfigType
  title: string
  description: string
  required: boolean
  enabled: () => boolean
  getStatus: () => Promise<ServiceStatus>
}

const mailTestSceneDefinitions = [
  {
    key: 'smtp-basic',
    label: 'SMTP 基础连通',
    description: '验证 SMTP 主机、端口、SSL、账号、授权码与发件人配置。',
  },
  {
    key: 'verify-code',
    label: '邮箱验证码',
    description: '覆盖注册、登录、找回密码与绑定邮箱共用的验证码模板。',
  },
  {
    key: 'submit-notify',
    label: '文件提交通知',
    description: '模拟任务收到新文件后给任务所有者发送的提醒。',
  },
  {
    key: 'service-alert',
    label: '服务错误告警',
    description: '模拟运行时异常、依赖服务异常等管理员告警邮件。',
  },
  {
    key: 'daily-limit',
    label: '每日发信上限提示',
    description: '发送一封带当前上限配置说明的测试邮件，确认配置说明类通知可达。',
  },
] as const

type MailTestSceneKey = typeof mailTestSceneDefinitions[number]['key']

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
    enabled: () => getStorageMode() === 'qiniu',
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
    enabled: isTxMessageEnabled,
    getStatus: getTxServiceStatus,
  },
  {
    type: 'smtp',
    title: 'SMTP 邮件',
    description: '验证码、通知与告警邮件',
    required: false,
    enabled: isSmtpServiceEnabled,
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

  @Inject(FileService)
  private fileService!: FileService

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

  getConfiguredServices() {
    return serviceDefinitions.filter((service) => {
      const hasConfig = LocalUserDB.findUserConfig({
        type: service.type,
      }).length > 0
      if (service.type === 'redis')
        return hasConfig && service.enabled()
      return hasConfig
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
    return this.getConfiguredServices().map((service) => {
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

  @Post('service/mail/test')
  async testMailConfig(@ReqBody() body: { to?: string, scenes?: string[] }) {
    const to = String(body?.to || '').trim().toLowerCase()
    if (!rEmail.test(to)) {
      return {
        ok: false,
        error: '邮箱格式不正确',
        results: [],
      }
    }
    if (!isSmtpConfigured()) {
      return {
        ok: false,
        error: 'SMTP 配置不完整，请先填写 host、user、pass、fromAddress 并保存',
        results: [],
      }
    }
    if (!isSmtpServiceEnabled()) {
      return {
        ok: false,
        error: 'SMTP 邮件服务未启用，请先在邮箱配置中开启并保存',
        results: [],
      }
    }

    const requested = new Set(Array.isArray(body?.scenes) ? body.scenes : [])
    const scenes = mailTestSceneDefinitions.filter(scene => requested.has(scene.key))
    const picked = scenes.length > 0 ? scenes : mailTestSceneDefinitions
    const site = LocalUserDB.getSiteConfig()
    const app = site?.appName || 'EasyPicker'
    const dailyLimit = typeof site?.emailDailyLimit === 'number' ? site.emailDailyLimit : 0
    const nowText = new Date().toLocaleString('zh-CN')

    const senders: Record<MailTestSceneKey, () => Promise<{ ok: boolean, error?: string }>> = {
      'smtp-basic': () => sendMail({
        to,
        subject: `[${app}] SMTP 基础连通测试`,
        text: [
          '这是一封 SMTP 基础连通测试邮件。',
          `测试时间：${nowText}`,
          '如果你收到这封邮件，说明 SMTP 主机、端口、SSL、账号授权与发件人信息至少可完成一次投递。',
        ].join('\n'),
      }),
      'verify-code': () => sendVerifyCodeMail(to, '1234'),
      'submit-notify': () => sendMail({
        to,
        subject: `${app} 新文件提交（测试）`,
        text: [
          '这是一封文件提交通知测试邮件，不代表真实任务发生了提交。',
          '任务：邮箱测试任务',
          '文件：demo-submit-file.pdf',
          `时间：${nowText}`,
        ].join('\n'),
      }),
      'service-alert': () => sendMail({
        to,
        subject: `[服务告警] ${app} 邮箱测试告警`,
        text: [
          '这是一封服务错误告警测试邮件，不代表系统真实发生异常。',
          '场景：运行时错误 / 依赖服务异常 / 后台任务失败等管理员告警。',
          `时间：${nowText}`,
        ].join('\n'),
      }),
      'daily-limit': () => sendMail({
        to,
        subject: `[${app}] 每日发信上限配置测试`,
        text: [
          '这是一封每日发信上限配置说明测试邮件。',
          `当前每日发信上限：${dailyLimit === 0 ? '不限制' : `${dailyLimit} 封`}`,
          '注意：每封测试邮件也会计入当日发信数量。',
          `测试时间：${nowText}`,
        ].join('\n'),
      }),
    }

    const results: Array<{
      key: MailTestSceneKey
      label: string
      ok: boolean
      error?: string
    }> = []

    for (const scene of picked) {
      const result = await senders[scene.key]()
      results.push({
        key: scene.key,
        label: scene.label,
        ok: result.ok,
        error: result.ok ? undefined : result.error || '发送失败',
      })
    }

    return {
      ok: results.every(item => item.ok),
      results,
    }
  }

  @Get('service/storage/info')
  getStorageInfo() {
    return {
      cwd: process.cwd(),
      uploadDir: uploadFileDir,
    }
  }

  @Get('service/global/all')
  async getSystemGlobalConfig(@ReqQuery('type') key = 'site') {
    const globalConfig = LocalUserDB.findUserConfig({
      type: 'global',
      key,
    })
    return globalConfig[0].value
  }

  @Put('service/global')
  async updateSystemGlobalConfig(@ReqBody() data) {
    const { key, value } = data
    const oldValue = key === 'site' ? LocalUserDB.getSiteConfig() : null
    await LocalUserDB.updateUserConfig(
      {
        type: 'global',
        key,
      },
      {
        value,
      },
    )
    if (this.shouldExpireUserOverviewCache(key, oldValue, value)) {
      await this.fileService.expireAllUserOverviewCache()
    }
  }

  @Get('global', { needLogin: false, userPower: null })
  async getGlobalConfig(
    @ReqQuery('type') key = 'site',
    @ReqQuery('scope') scope?: string,
  ) {
    const globalConfig = LocalUserDB.findUserConfig({
      type: 'global',
      key,
    })
    const normalizedScope = (scope || 'site') as GlobalConfigScope
    const filterKey: (keyof GlobalSiteConfig)[]
      = normalizedScope === 'site'
        ? GLOBAL_CONFIG_SITE_KEYS
        : (GLOBAL_CONFIG_SCOPES[normalizedScope] ?? GLOBAL_CONFIG_SITE_KEYS)
    const supportCodeLogin = isCodeLoginSupported()
    const supportEmailCodeLogin = isEmailCodeLoginSupported()
    const supportPhoneCode = isTxMessageConfigured()
    const result: Partial<GlobalSiteConfig> = {
      supportPhoneCode,
      supportCodeLogin,
      supportEmailCodeLogin,
    }
    const globalValue = (globalConfig[0]?.value || {}) as Partial<GlobalSiteConfig>
    filterKey.forEach((cur) => {
      result[cur] = globalValue[cur] as never
    })
    if (filterKey.includes('needBindPhone')) {
      result.needBindPhone = Boolean(result.needBindPhone && (supportPhoneCode || supportEmailCodeLogin))
    }
    if (filterKey.includes('needBindEmail')) {
      result.needBindEmail = Boolean(result.needBindEmail && supportEmailCodeLogin)
    }
    return result
  }

  @Get('global/account', { needLogin: true })
  async getAccountGlobalConfig(@ReqQuery('type') key = 'site') {
    const globalConfig = LocalUserDB.findUserConfig({
      type: 'global',
      key,
    })
    const globalValue = (globalConfig[0]?.value || {}) as Partial<GlobalSiteConfig>
    const result: Partial<GlobalSiteConfig> = {}
    GLOBAL_CONFIG_ACCOUNT_KEYS.forEach((cur) => {
      result[cur] = globalValue[cur] as never
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
    const oldValue = key === 'site' ? LocalUserDB.getSiteConfig() : null
    await LocalUserDB.updateUserConfig(
      {
        type: 'global',
        key,
      },
      {
        value,
      },
    )
    if (this.shouldExpireUserOverviewCache(key, oldValue, value)) {
      await this.fileService.expireAllUserOverviewCache()
    }
  }

  private shouldExpireUserOverviewCache(
    key: string,
    oldValue: Partial<GlobalSiteConfig> | null,
    value: Partial<GlobalSiteConfig>,
  ) {
    if (key !== 'site' || !oldValue || !value) {
      return false
    }
    return billingConfigKeys.some(k => oldValue[k] !== value[k])
  }
}
