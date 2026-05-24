<script lang="ts" setup>
import { CopyDocument, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ConfigServiceAPI, PublicApi, UserApi } from '@/apis'
import { useSiteConfig } from '@/composables'
import { rAccount, rEmail, rMobilePhone, rPassword, rVerCode } from '@/utils/regExp'
import Tip from '../tasks/components/infoPanel/tip.vue'

type ConfigData = ConfigServiceAPITypes.ConfigData
type ServiceConfigItem = ConfigServiceAPITypes.ServiceConfigItem
type ServiceOverviewItem = ConfigServiceAPITypes.ServiceOverviewItem
type MysqlSchemaOverview = ConfigServiceAPITypes.MysqlSchemaOverview
type MysqlLiveIntrospection = ConfigServiceAPITypes.MysqlLiveIntrospection
type MysqlLiveTable = ConfigServiceAPITypes.MysqlLiveTable

/** 与 MySQL 相关的子 Tab（连接配置仍在 name=mysql 的主 Tab）；结构与脚本已与「在线库表」合并 */
const MYSQL_INTROSPECT_TAB = 'mysql-introspect'
const SERVICE_FEATURES_TAB = 'service-features'
const CONFIG_ADMIN_USERS_TAB = 'config-admin-users'

const { value: siteConfig } = useSiteConfig()

const mysqlSchema = ref<MysqlSchemaOverview | null>(null)
const schemaLoading = ref(false)

/** 建表 SQL 全屏预览 */
const mysqlExportDialogVisible = ref(false)
const mysqlExportLoading = ref(false)
const mysqlExportSql = ref('')
const mysqlExportDescription = ref('')
const mysqlExportError = ref('')

const serviceOverview = ref<ServiceOverviewItem[]>([])
const serverConfig = ref<ConfigData[]>([])
const loading = ref(false)
const configLoading = ref(false)
const activeConfigTab = ref('')
const savingMap = reactive<Record<string, boolean>>({})
const siteFeatureLoading = ref(false)
const siteFeatureSaving = ref(false)
const siteFeatureForm = reactive({
  storageMode: 'qiniu' as 'qiniu' | 'local',
  maxUploadSizeMB: 500,
  needBindPhone: false,
  enableCodeLogin: false,
  enableEmailCodeLogin: false,
  needBindEmail: false,
  alertEmails: '',
  emailDailyLimit: 0,
})
const storageInfo = ref<ConfigServiceAPITypes.StorageInfo>({
  cwd: '',
  uploadDir: '',
})
const mailTestSceneOptions: Array<{
  key: ConfigServiceAPITypes.MailTestSceneKey
  label: string
  description: string
}> = [
  {
    key: 'smtp-basic',
    label: 'SMTP 基础连通',
    description: '主机、端口、SSL、账号授权与发件人。',
  },
  {
    key: 'verify-code',
    label: '邮箱验证码',
    description: '注册、登录、找回密码、绑定邮箱共用模板。',
  },
  {
    key: 'submit-notify',
    label: '文件提交通知',
    description: '任务收到新文件后给任务所有者的提醒。',
  },
  {
    key: 'service-alert',
    label: '服务错误告警',
    description: '运行时异常、依赖服务异常等管理员告警。',
  },
  {
    key: 'daily-limit',
    label: '每日发信上限提示',
    description: '确认发信上限说明类通知可达。',
  },
]
const mailTestDialogVisible = ref(false)
const mailTestSubmitting = ref(false)
const mailTestForm = reactive<{
  to: string
  scenes: ConfigServiceAPITypes.MailTestSceneKey[]
}>({
  to: '',
  scenes: mailTestSceneOptions.map(item => item.key),
})
const mailTestResults = ref<ConfigServiceAPITypes.MailTestResultItem[]>([])
const mailTestError = ref('')

const overviewStats = computed(() => {
  const total = serviceOverview.value.length
  const running = serviceOverview.value.filter(item => item.status).length
  const required = serviceOverview.value.filter(item => item.required).length
  const optional = total - required
  return {
    total,
    running,
    required,
    optional,
    abnormal: total - running,
  }
})
const showErrorList = computed(() => serviceOverview.value.filter(item => item.errMsg))
const showMysqlToolTabs = computed(() => serverConfig.value.some(s => s.type === 'mysql'))
const mysqlLive = ref<MysqlLiveIntrospection | null>(null)
const mysqlLiveLoading = ref(false)
const mysqlLiveOpenNames = ref<string[]>([])

const currentConfig = computed(() => serverConfig.value.find(item => item.type === activeConfigTab.value))
const emailConfigSaving = computed(() => Boolean(savingMap.smtp) || siteFeatureSaving.value)
const txConfigSaving = computed(() => Boolean(savingMap.tx) || siteFeatureSaving.value)

function isActiveConfigTabValid(name: string) {
  if (name === SERVICE_FEATURES_TAB)
    return true
  if (name === CONFIG_ADMIN_USERS_TAB)
    return true
  if (serverConfig.value.some(item => item.type === name))
    return true
  if (showMysqlToolTabs.value && name === MYSQL_INTROSPECT_TAB)
    return true
  return false
}

function getServiceTagType(service: ServiceOverviewItem) {
  if (service.status) {
    return 'success'
  }
  return service.required ? 'danger' : 'warning'
}

function getServiceTagText(service: ServiceOverviewItem) {
  if (service.status) {
    return '运行中'
  }
  return service.required ? '异常' : '未就绪'
}

function isBooleanConfig(item: ServiceConfigItem) {
  return (
    typeof item.value === 'boolean'
    || item.key === 'auth'
    || item.key === 'autoCreateDatabase'
    || item.key === 'autoSyncSchemaOnStartup'
  )
}

function isNumberConfig(item: ServiceConfigItem) {
  return typeof item.value === 'number' || item.key === 'port'
}

function isSmtpConfig(group?: ConfigData) {
  return group?.type === 'smtp'
}

function isTxConfig(group?: ConfigData) {
  return group?.type === 'tx'
}

function getConfigTabLabel(group: ConfigData) {
  return isSmtpConfig(group) ? '邮箱配置' : group.title
}

function getConfigHeadTitle(group: ConfigData) {
  return isSmtpConfig(group) ? '邮箱配置' : group.title
}

function getConfigHeadDescription(group: ConfigData) {
  if (isSmtpConfig(group))
    return '管理 SMTP 发信连接，以及邮箱验证码、服务告警收件邮箱与每日发信上限。'
  if (isTxConfig(group))
    return '管理腾讯云短信配置，以及手机号验证码登录、注册绑定手机相关能力。'
  return group.description
}

function getConfigSaving(group: ConfigData) {
  if (isSmtpConfig(group))
    return emailConfigSaving.value
  if (isTxConfig(group))
    return txConfigSaving.value
  return Boolean(savingMap[group.type])
}

function saveConfigGroup(group: ConfigData) {
  if (isSmtpConfig(group))
    return saveEmailConfig(group)
  if (isTxConfig(group))
    return saveTxFeatures(group)
  return updateCfgGroup(group)
}

function updateConfigValue(item: ServiceConfigItem, value: string | number | boolean) {
  item.value = value
}

async function loadMysqlSchema() {
  schemaLoading.value = true
  try {
    const { data } = await ConfigServiceAPI.getMysqlSchema()
    mysqlSchema.value = data ?? null
  }
  catch {
    mysqlSchema.value = null
  }
  finally {
    schemaLoading.value = false
  }
}

async function loadMysqlLiveIntrospect() {
  mysqlLiveLoading.value = true
  try {
    const { data } = await ConfigServiceAPI.getMysqlLiveIntrospect()
    mysqlLive.value = data ?? null
  }
  catch {
    mysqlLive.value = null
  }
  finally {
    mysqlLiveLoading.value = false
  }
}

function formatBytes(n: number | null) {
  if (n == null || Number.isNaN(n))
    return '—'
  if (n < 1024)
    return `${n} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = n / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`
}

function indexColumnsLabel(idx: MysqlLiveTable['indexes'][number]) {
  return idx.columns
    .map((c) => {
      const p = c.subPart != null ? `(${c.subPart})` : ''
      return `${c.column}${p}`
    })
    .join(', ')
}

async function copyMysqlTableDdl(tbl: MysqlLiveTable) {
  const text = tbl.createSql?.trim() ?? ''
  if (!text) {
    ElMessage.warning('建表语句为空')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(`已复制 ${tbl.name} 的建表 SQL`)
  }
  catch {
    ElMessage.error('复制失败，请手动选取文本框中的内容')
  }
}

async function applyMysqlSchema() {
  schemaLoading.value = true
  try {
    await ConfigServiceAPI.applyMysqlSchema()
    await loadMysqlSchema()
    await loadMysqlLiveIntrospect()
    await refreshStatus(false)
    ElMessage.success('已按 mysql-schema.json 对齐缺列及列类型')
  }
  catch {
    ElMessage.error('执行失败，请查看服务端日志')
  }
  finally {
    schemaLoading.value = false
  }
}

async function openMysqlExportDialog() {
  mysqlExportDialogVisible.value = true
  mysqlExportSql.value = ''
  mysqlExportDescription.value = ''
  mysqlExportError.value = ''
  mysqlExportLoading.value = true
  try {
    const { data } = await ConfigServiceAPI.getMysqlSchemaExportSql()
    if (!data?.sql?.trim() || data?.error) {
      mysqlExportError.value = data?.error || '未生成 SQL'
      return
    }
    mysqlExportSql.value = data.sql
    mysqlExportDescription.value = data.description?.trim() ?? ''
  }
  catch {
    mysqlExportError.value = '加载失败，请稍后重试'
  }
  finally {
    mysqlExportLoading.value = false
  }
}

function onMysqlExportDialogClosed() {
  mysqlExportSql.value = ''
  mysqlExportDescription.value = ''
  mysqlExportError.value = ''
}

function closeMysqlExportDialog() {
  mysqlExportDialogVisible.value = false
  onMysqlExportDialogClosed()
}

const adminUsersLoading = ref(false)
const adminUsersList = ref<ConfigServiceAPITypes.ConfigAdminUserRow[]>([])
const loginIsSuper = ref(false)
const loginIsSystem = ref(false)
const canOperateConfigAdmins = computed(() => loginIsSuper.value || loginIsSystem.value)

const adminCreateForm = reactive({
  account: '',
  pwd1: '',
  pwd2: '',
  bindPhone: false,
  phone: '',
  code: '',
})
const adminCreateSubmitting = ref(false)
const adminResetVisible = ref(false)
const adminResetRow = ref<ConfigServiceAPITypes.ConfigAdminUserRow | null>(null)
const adminResetPwd1 = ref('')
const adminResetPwd2 = ref('')
const adminResetSubmitting = ref(false)
const adminCodeText = ref('获取验证码')
const adminCodeTime = ref(0)

function refreshAdminCodeText() {
  if (adminCodeTime.value === 0) {
    adminCodeText.value = '获取验证码'
    return
  }
  adminCodeText.value = `${adminCodeTime.value}s`
  adminCodeTime.value -= 1
  setTimeout(refreshAdminCodeText, 1000)
}

function getAdminCreateCode() {
  if (!rMobilePhone.test(adminCreateForm.phone)) {
    ElMessage.warning('手机号格式不正确')
    return
  }
  PublicApi.getCode(adminCreateForm.phone).then(() => {
    adminCodeTime.value = 120
    refreshAdminCodeText()
    ElMessage.success('验证码已发送')
  })
}

function adminStatusLabel(status: number) {
  if (status === 0)
    return '正常'
  if (status === 1)
    return '冻结'
  if (status === 2)
    return '封禁'
  return String(status)
}

async function loadLoginPower() {
  try {
    const { data } = await UserApi.checkPower()
    loginIsSuper.value = Boolean(data?.power)
    loginIsSystem.value = Boolean(data?.system)
  }
  catch {
    loginIsSuper.value = false
    loginIsSystem.value = false
  }
}

async function loadAdminUsers() {
  adminUsersLoading.value = true
  try {
    const { data } = await ConfigServiceAPI.listConfigAdminUsers()
    adminUsersList.value = data?.list ?? []
  }
  catch {
    adminUsersList.value = []
  }
  finally {
    adminUsersLoading.value = false
  }
}

watch(() => [siteConfig.value?.needBindPhone, siteConfig.value?.supportPhoneCode], ([need, supportPhone]) => {
  if (need && supportPhone)
    adminCreateForm.bindPhone = true
}, { immediate: true })

function checkAdminCreateForm(): boolean {
  if (!canOperateConfigAdmins.value) {
    ElMessage.warning('当前账号无权创建超级管理员')
    return false
  }
  if (!rAccount.test(adminCreateForm.account)) {
    ElMessage.warning('帐号格式不正确(4-11位 数字字母)')
    return false
  }
  if (!rPassword.test(adminCreateForm.pwd1)) {
    ElMessage.warning('密码格式不正确(6-16位 支持字母/数字/下划线)')
    return false
  }
  if (adminCreateForm.pwd1 !== adminCreateForm.pwd2) {
    ElMessage.warning('两次输入的密码不一致')
    return false
  }
  if (adminCreateForm.bindPhone) {
    if (!rMobilePhone.test(adminCreateForm.phone)) {
      ElMessage.warning('手机号格式不正确')
      return false
    }
    if (!rVerCode.test(adminCreateForm.code)) {
      ElMessage.warning('验证码不正确(4位 数字)')
      return false
    }
  }
  return true
}

async function submitCreateAdminUser() {
  if (!checkAdminCreateForm())
    return
  adminCreateSubmitting.value = true
  try {
    const { data } = await ConfigServiceAPI.createConfigAdminUser({
      account: adminCreateForm.account,
      pwd: adminCreateForm.pwd1,
      bindPhone: adminCreateForm.bindPhone,
      phone: adminCreateForm.phone,
      code: adminCreateForm.code,
    })
    if (!data?.ok) {
      ElMessage.error(data?.error || '创建失败')
      return
    }
    ElMessage.success('管理员账号已创建')
    adminCreateForm.account = ''
    adminCreateForm.pwd1 = ''
    adminCreateForm.pwd2 = ''
    adminCreateForm.phone = ''
    adminCreateForm.code = ''
    await loadAdminUsers()
  }
  catch {
    ElMessage.error('请求失败')
  }
  finally {
    adminCreateSubmitting.value = false
  }
}

function openAdminResetDialog(row: ConfigServiceAPITypes.ConfigAdminUserRow) {
  adminResetRow.value = row
  adminResetPwd1.value = ''
  adminResetPwd2.value = ''
  adminResetVisible.value = true
}

function closeAdminResetDialog() {
  adminResetVisible.value = false
  adminResetRow.value = null
}

async function submitAdminResetPassword() {
  if (!adminResetRow.value) {
    return
  }
  if (!rPassword.test(adminResetPwd1.value)) {
    ElMessage.warning('密码格式不正确(6-16位 支持字母/数字/下划线)')
    return
  }
  if (adminResetPwd1.value !== adminResetPwd2.value) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  adminResetSubmitting.value = true
  try {
    const { data } = await ConfigServiceAPI.resetConfigAdminUserPassword({
      id: adminResetRow.value.id,
      pwd: adminResetPwd1.value,
    })
    if (!data?.ok) {
      ElMessage.error(data?.error || '重置失败')
      return
    }
    ElMessage.success('密码已重置')
    closeAdminResetDialog()
  }
  catch {
    ElMessage.error('请求失败')
  }
  finally {
    adminResetSubmitting.value = false
  }
}

watch(mysqlExportDialogVisible, (open) => {
  if (typeof document === 'undefined')
    return
  document.body.style.overflow = open ? 'hidden' : ''
})

async function copyMysqlExportSqlAll() {
  const text = mysqlExportSql.value?.trim?.() ?? ''
  if (!text) {
    ElMessage.warning('暂无 SQL 可复制')
    return
  }
  try {
    await navigator.clipboard.writeText(mysqlExportSql.value)
    ElMessage.success('已复制全部 SQL')
  }
  catch {
    ElMessage.error('复制失败，请手动在文本框中选取复制')
  }
}

async function refreshStatus(showSuccess = true) {
  if (loading.value)
    return
  loading.value = true
  try {
    const { data } = await ConfigServiceAPI.getServiceOverview()
    serviceOverview.value = data || []
    if (showSuccess) {
      ElMessage.success('服务状态刷新完成')
    }
  }
  catch {
    ElMessage.error('服务状态刷新失败')
  }
  finally {
    loading.value = false
  }
}

async function getServiceConfig() {
  configLoading.value = true
  try {
    const { data } = await ConfigServiceAPI.getServiceConfig()
    serverConfig.value = data || []
    if (!activeConfigTab.value || !isActiveConfigTabValid(activeConfigTab.value)) {
      activeConfigTab.value = serverConfig.value[0]?.type || SERVICE_FEATURES_TAB
    }
  }
  catch {
    ElMessage.error('服务配置加载失败')
  }
  finally {
    configLoading.value = false
  }
}

async function loadSiteFeatures() {
  siteFeatureLoading.value = true
  try {
    const [{ data }, storageRes] = await Promise.all([
      ConfigServiceAPI.getGlobalAllConfig('site'),
      ConfigServiceAPI.getStorageInfo(),
    ])
    Object.assign(siteFeatureForm, {
      storageMode: data?.storageMode === 'local' ? 'local' : 'qiniu',
      maxUploadSizeMB: Number(data?.maxUploadSizeMB ?? 500),
      needBindPhone: Boolean(data?.needBindPhone),
      enableCodeLogin: Boolean(data?.enableCodeLogin),
      enableEmailCodeLogin: Boolean(data?.enableEmailCodeLogin),
      needBindEmail: Boolean(data?.needBindEmail),
      alertEmails: data?.alertEmails || '',
      emailDailyLimit: Number(data?.emailDailyLimit ?? 0),
    })
    storageInfo.value = storageRes.data || { cwd: '', uploadDir: '' }
  }
  catch {
    ElMessage.error('服务功能配置加载失败')
  }
  finally {
    siteFeatureLoading.value = false
  }
}

async function copyStorageDir() {
  const uploadDir = storageInfo.value.uploadDir
  if (!uploadDir)
    return
  try {
    await navigator.clipboard.writeText(uploadDir)
    ElMessage.success('存储目录已复制')
  }
  catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

async function updateSiteConfigPatch(patch: Record<string, unknown>) {
  const { data } = await ConfigServiceAPI.getGlobalAllConfig('site')
  await ConfigServiceAPI.updateGlobalConfig('site', {
    ...data,
    ...patch,
  })
}

function checkEmailFeatures() {
  if (siteFeatureForm.emailDailyLimit < 0) {
    ElMessage.warning('每日发信上限不能小于 0')
    return false
  }
  return true
}

async function saveTxFeatures(group?: ConfigData) {
  if (!group || !isTxConfig(group) || savingMap[group.type] || siteFeatureSaving.value)
    return

  savingMap[group.type] = true
  siteFeatureSaving.value = true
  try {
    await ConfigServiceAPI.updateCfg(group.data)
    await updateSiteConfigPatch({
      needBindPhone: Boolean(siteFeatureForm.needBindPhone),
      enableCodeLogin: Boolean(siteFeatureForm.enableCodeLogin),
    })
    ElMessage.success('腾讯云配置已保存')
    await getServiceConfig()
    await loadSiteFeatures()
    await refreshStatus(false)
  }
  catch {
    ElMessage.error('腾讯云配置保存失败')
  }
  finally {
    savingMap[group.type] = false
    siteFeatureSaving.value = false
  }
}

async function saveStorageFeatures() {
  if (siteFeatureSaving.value)
    return
  if (siteFeatureForm.maxUploadSizeMB < 1) {
    ElMessage.warning('本机单文件上限需大于 0')
    return
  }
  siteFeatureSaving.value = true
  try {
    await updateSiteConfigPatch({
      storageMode: siteFeatureForm.storageMode === 'local' ? 'local' : 'qiniu',
      maxUploadSizeMB: Number(siteFeatureForm.maxUploadSizeMB),
    })
    ElMessage.success('服务功能配置已保存')
    await loadSiteFeatures()
    await refreshStatus(false)
  }
  catch {
    ElMessage.error('服务功能配置保存失败')
  }
  finally {
    siteFeatureSaving.value = false
  }
}

async function saveEmailConfig(group?: ConfigData) {
  if (!group || !isSmtpConfig(group) || savingMap[group.type] || siteFeatureSaving.value)
    return
  if (!checkEmailFeatures())
    return

  savingMap[group.type] = true
  siteFeatureSaving.value = true
  try {
    await ConfigServiceAPI.updateCfg(group.data)
    await updateSiteConfigPatch({
      enableEmailCodeLogin: Boolean(siteFeatureForm.enableEmailCodeLogin),
      needBindEmail: Boolean(siteFeatureForm.needBindEmail),
      alertEmails: siteFeatureForm.alertEmails.trim(),
      emailDailyLimit: Number(siteFeatureForm.emailDailyLimit),
    })
    ElMessage.success('邮箱配置已保存')
    await getServiceConfig()
    await loadSiteFeatures()
    await refreshStatus(false)
  }
  catch {
    ElMessage.error('邮箱配置保存失败')
  }
  finally {
    savingMap[group.type] = false
    siteFeatureSaving.value = false
  }
}

function openMailTestDialog() {
  mailTestResults.value = []
  mailTestError.value = ''
  if (mailTestForm.scenes.length === 0) {
    mailTestForm.scenes = mailTestSceneOptions.map(item => item.key)
  }
  mailTestDialogVisible.value = true
}

function closeMailTestDialog() {
  if (mailTestSubmitting.value)
    return
  mailTestDialogVisible.value = false
}

async function submitMailTest() {
  const to = mailTestForm.to.trim()
  if (!rEmail.test(to)) {
    ElMessage.warning('请填写正确的接收邮箱')
    return
  }
  if (mailTestForm.scenes.length === 0) {
    ElMessage.warning('请至少选择一个测试场景')
    return
  }
  mailTestSubmitting.value = true
  mailTestResults.value = []
  mailTestError.value = ''
  try {
    const { data } = await ConfigServiceAPI.testMailConfig({
      to,
      scenes: mailTestForm.scenes,
    })
    mailTestResults.value = data?.results ?? []
    mailTestError.value = data?.error || ''
    if (data?.ok) {
      ElMessage.success('测试邮件已发送')
    }
    else {
      ElMessage.warning(data?.error || '部分测试邮件发送失败')
    }
  }
  catch {
    mailTestError.value = '测试邮件发送失败，请查看服务端日志'
    ElMessage.error(mailTestError.value)
  }
  finally {
    mailTestSubmitting.value = false
  }
}

function configMysqlDataToCheckBody(
  items: ServiceConfigItem[],
): ConfigServiceAPITypes.MysqlCheckDatabaseBody {
  const pick = ['host', 'port', 'user', 'password', 'database'] as const
  const body: ConfigServiceAPITypes.MysqlCheckDatabaseBody = {}
  for (const it of items) {
    if (it.type !== 'mysql' || !pick.includes(it.key as typeof pick[number]))
      continue
    const k = it.key as keyof ConfigServiceAPITypes.MysqlCheckDatabaseBody
    body[k] = it.value as never
  }
  return body
}

const MYSQL_AUTO_CREATE_LABEL = '无库或缺表时自动建库并按模板导入全部表结构'

/** 保存前：无库 / 空库时需开启 autoCreateDatabase，否则 bootstrap 不会导入模板 SQL */
async function ensureMysqlAutoCreateForBootstrap(
  group: ConfigData,
  box: { title: string, message: string },
): Promise<boolean> {
  const autoItem = group.data.find(i => i.key === 'autoCreateDatabase')
  if (autoItem?.value)
    return true
  try {
    await ElMessageBox.confirm(
      box.message,
      box.title,
      {
        type: 'warning',
        confirmButtonText: '开启并保存',
        cancelButtonText: '取消',
      },
    )
  }
  catch {
    return false
  }
  if (autoItem) {
    autoItem.value = true
  }
  else {
    group.data.push({
      type: 'mysql',
      key: 'autoCreateDatabase',
      value: true,
      label: MYSQL_AUTO_CREATE_LABEL,
      isSecret: false,
    })
  }
  return true
}

async function updateCfgGroup(group?: ConfigData) {
  if (!group || savingMap[group.type])
    return

  if (group.type === 'mysql') {
    let check: ConfigServiceAPITypes.MysqlCheckDatabaseResult | null = null
    try {
      const { data } = await ConfigServiceAPI.checkMysqlDatabase(configMysqlDataToCheckBody(group.data))
      check = data ?? null
    }
    catch {
      ElMessage.error('检测数据库状态失败')
      return
    }
    if (!check) {
      ElMessage.error('检测数据库状态失败')
      return
    }
    if (!check.canConnect) {
      ElMessage.error(check.error || '无法连接 MySQL，请检查地址与账号')
      return
    }
    const dbName = group.data.find(i => i.key === 'database')?.value
    const name = dbName != null ? String(dbName).trim() : ''
    if (!check.databaseExists) {
      const ok = await ensureMysqlAutoCreateForBootstrap(group, {
        title: '数据库不存在',
        message: name
          ? `服务器上不存在名为「${name}」的数据库。是否开启「${MYSQL_AUTO_CREATE_LABEL}」并保存？`
          : `服务器上不存在该数据库。是否开启「${MYSQL_AUTO_CREATE_LABEL}」并保存？`,
      })
      if (!ok)
        return
    }
    else if (!check.hasCoreTables) {
      const ok = await ensureMysqlAutoCreateForBootstrap(group, {
        title: '缺少表结构',
        message: name
          ? `数据库「${name}」已存在，但未检测到与模板一致的核心表结构（如 user）。是否开启「${MYSQL_AUTO_CREATE_LABEL}」并保存？导入后请确认数据与备份。`
          : `目标数据库已存在，但未检测到与模板一致的核心表结构。是否开启「${MYSQL_AUTO_CREATE_LABEL}」并保存？导入后请确认数据与备份。`,
      })
      if (!ok)
        return
    }
  }

  savingMap[group.type] = true
  try {
    await ConfigServiceAPI.updateCfg(group.data)
    ElMessage.success(`${group.title} 配置已保存`)
    await getServiceConfig()
    await refreshStatus(false)
    if (group.type === 'mysql') {
      await loadMysqlSchema()
      await loadMysqlLiveIntrospect()
    }
  }
  catch {
    ElMessage.error(`${group.title} 配置保存失败`)
  }
  finally {
    savingMap[group.type] = false
  }
}

onMounted(() => {
  refreshStatus(false)
  getServiceConfig()
  loadSiteFeatures()
})

async function refreshMysqlToolsTab() {
  await loadMysqlSchema()
  await loadMysqlLiveIntrospect()
}

watch(activeConfigTab, (t) => {
  if (t === MYSQL_INTROSPECT_TAB)
    refreshMysqlToolsTab()
  if (t === CONFIG_ADMIN_USERS_TAB) {
    loadLoginPower()
    loadAdminUsers()
  }
})
</script>

<template>
  <div class="config-page">
    <section class="hero-card">
      <div>
        <p class="eyebrow">
          服务配置
        </p>
        <h1>依赖服务概况</h1>
        <p class="hero-desc">
          按服务端当前实际启用的能力展示依赖状态；未启用的 Redis 不展示，MongoDB 异常也不会影响本页配置管理。
        </p>
      </div>
      <div class="hero-stats">
        <div>
          <strong>{{ overviewStats.running }}</strong>
          <span>运行中</span>
        </div>
        <div>
          <strong>{{ overviewStats.abnormal }}</strong>
          <span>需关注</span>
        </div>
        <div>
          <strong>{{ overviewStats.optional }}</strong>
          <span>可选服务</span>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="section-head">
        <div>
          <h2>总体依赖服务概况</h2>
          <Tip>这里只检查当前服务端正在使用或已配置的依赖服务。</Tip>
        </div>
        <el-button :loading="loading" :icon="Refresh" @click="refreshStatus()">
          刷新状态
        </el-button>
      </div>

      <el-empty v-if="!loading && !serviceOverview.length" description="暂无可展示的服务依赖" />
      <div v-else v-loading="loading" class="service-grid">
        <article
          v-for="service in serviceOverview"
          :key="service.type"
          class="service-card"
          :class="{ error: !service.status }"
        >
          <div class="service-card-head">
            <div>
              <h3>{{ service.title }}</h3>
              <p>{{ service.description }}</p>
            </div>
            <el-tag :type="getServiceTagType(service)" effect="dark">
              {{ getServiceTagText(service) }}
            </el-tag>
          </div>
          <div class="service-meta">
            <span>{{ service.required ? '核心依赖' : '可选依赖' }}</span>
            <span v-if="service.errMsg" class="error-text">{{ service.errMsg }}</span>
          </div>
        </article>
      </div>
    </section>

    <section v-show="showErrorList.length" class="panel">
      <div class="section-head compact">
        <div>
          <h2>异常信息</h2>
          <p>以下服务未通过状态检查，可在对应配置 Tab 中集中修改后保存。</p>
        </div>
      </div>
      <div class="error-list">
        <p v-for="err in showErrorList" :key="err.type">
          <strong>{{ err.title }}：</strong>
          <span>{{ err.errMsg }}</span>
        </p>
      </div>
    </section>

    <section class="panel">
      <div class="section-head">
        <div>
          <h2>服务相关配置</h2>
          <Tip>
            各类服务按 Tab 展开编辑，同一类服务修改完成后统一保存。
            <a
              href="https://docs.ep.sugarat.top/introduction/feature/system.html"
            >
              <el-button type="primary" link>配置手册?</el-button></a>
          </Tip>
        </div>
      </div>

      <el-empty v-if="!configLoading && !serverConfig.length" description="暂无可编辑的服务配置" />
      <div v-else v-loading="configLoading">
        <el-tabs v-model="activeConfigTab" class="config-tabs">
          <el-tab-pane
            v-for="serverItem in serverConfig"
            :key="serverItem.type"
            :label="getConfigTabLabel(serverItem)"
            :name="serverItem.type"
          >
            <div class="tab-head">
              <div>
                <h3>{{ getConfigHeadTitle(serverItem) }}</h3>
                <p>{{ getConfigHeadDescription(serverItem) }}</p>
              </div>
              <div class="tab-head-actions">
                <el-button
                  v-if="isSmtpConfig(serverItem)"
                  :disabled="emailConfigSaving"
                  @click="openMailTestDialog"
                >
                  测试邮箱
                </el-button>
                <el-button
                  type="primary"
                  :loading="getConfigSaving(serverItem)"
                  @click="saveConfigGroup(serverItem)"
                >
                  保存 {{ getConfigTabLabel(serverItem) }}
                </el-button>
              </div>
            </div>

            <el-form
              v-loading="(isSmtpConfig(serverItem) || isTxConfig(serverItem)) && siteFeatureLoading"
              label-position="top"
              class="config-form"
            >
              <div
                class="field-list"
                :class="{ 'field-list--grouped': isSmtpConfig(serverItem) || isTxConfig(serverItem) }"
              >
                <div v-if="isSmtpConfig(serverItem) || isTxConfig(serverItem)" class="config-subsection">
                  <div class="config-subsection__head">
                    <template v-if="isSmtpConfig(serverItem)">
                      <h4>SMTP 配置</h4>
                      <p>发信服务器、账号、授权码与发件人信息。</p>
                    </template>
                    <template v-else>
                      <h4>腾讯云短信配置</h4>
                      <p>短信验证码所需的 Secret、短信应用、签名和模板信息。</p>
                    </template>
                  </div>
                </div>
                <el-form-item
                  v-for="cfgItem in serverItem.data"
                  :key="cfgItem.key"
                  class="field-item"
                >
                  <template #label>
                    <span class="field-label">{{ cfgItem.label || cfgItem.key }}</span>
                    <span v-if="cfgItem.isSecret" class="field-desc">敏感项未修改时会保持原值</span>
                  </template>

                  <el-switch
                    v-if="isBooleanConfig(cfgItem)"
                    :model-value="Boolean(cfgItem.value)"
                    inline-prompt
                    active-text="开"
                    inactive-text="关"
                    @update:model-value="updateConfigValue(cfgItem, $event)"
                  />
                  <el-input-number
                    v-else-if="isNumberConfig(cfgItem)"
                    :model-value="Number(cfgItem.value)"
                    :min="0"
                    controls-position="right"
                    class="full-control"
                    @update:model-value="updateConfigValue(cfgItem, Number($event))"
                  />
                  <el-input
                    v-else
                    :model-value="String(cfgItem.value)"
                    :type="cfgItem.isSecret ? 'password' : 'text'"
                    :show-password="cfgItem.isSecret"
                    :placeholder="cfgItem.isSecret ? '留空则保持原值' : '请输入'"
                    clearable
                    @update:model-value="updateConfigValue(cfgItem, $event)"
                  />
                </el-form-item>

                <div v-if="isTxConfig(serverItem)" class="config-subsection config-subsection--spaced">
                  <div class="config-subsection__head">
                    <h4>手机号验证码功能配置</h4>
                    <p>控制手机号验证码登录，以及注册时绑定手机号入口。</p>
                  </div>
                </div>

                <template v-if="isTxConfig(serverItem)">
                  <el-form-item class="field-item">
                    <template #label>
                      <span class="field-label">手机号验证码登录</span>
                      <span class="field-desc">开启且腾讯云短信配置完整时，前台展示手机号验证码登录入口。</span>
                    </template>
                    <el-switch
                      v-model="siteFeatureForm.enableCodeLogin"
                      inline-prompt
                      active-text="开"
                      inactive-text="关"
                    />
                  </el-form-item>

                  <el-form-item class="field-item">
                    <template #label>
                      <span class="field-label">注册绑定手机</span>
                      <span class="field-desc">开启且腾讯云短信配置完整时，注册页展示绑定手机选项；可与邮箱绑定二选一。</span>
                    </template>
                    <el-switch
                      v-model="siteFeatureForm.needBindPhone"
                      inline-prompt
                      active-text="开"
                      inactive-text="关"
                    />
                  </el-form-item>
                </template>

                <div v-if="isSmtpConfig(serverItem)" class="config-subsection config-subsection--spaced">
                  <div class="config-subsection__head">
                    <h4>其它邮箱功能配置</h4>
                    <p>邮箱验证码、告警收件邮箱与全局发信频率控制。</p>
                  </div>
                </div>

                <template v-if="isSmtpConfig(serverItem)">
                  <el-form-item class="field-item">
                    <template #label>
                      <span class="field-label">邮箱验证码</span>
                      <span class="field-desc">默认关闭；开启且 SMTP 配置完整时，支持邮箱验证码登录、注册与找回密码。</span>
                    </template>
                    <el-switch
                      v-model="siteFeatureForm.enableEmailCodeLogin"
                      inline-prompt
                      active-text="开"
                      inactive-text="关"
                    />
                  </el-form-item>

                  <el-form-item class="field-item">
                    <template #label>
                      <span class="field-label">强制绑定邮箱</span>
                      <span class="field-desc">开启且 SMTP 配置完整时，注册表单会要求填写并验证邮箱。</span>
                    </template>
                    <el-switch
                      v-model="siteFeatureForm.needBindEmail"
                      inline-prompt
                      active-text="开"
                      inactive-text="关"
                    />
                  </el-form-item>

                  <el-form-item class="field-item">
                    <template #label>
                      <span class="field-label">服务告警收件邮箱</span>
                      <span class="field-desc">多个邮箱可用逗号、分号或空格分隔；SMTP 完整后服务异常会发送告警。</span>
                    </template>
                    <el-input
                      v-model="siteFeatureForm.alertEmails"
                      type="textarea"
                      :rows="2"
                      placeholder="admin@example.com; ops@example.com"
                      clearable
                    />
                  </el-form-item>

                  <el-form-item class="field-item">
                    <template #label>
                      <span class="field-label">每日发信上限</span>
                      <span class="field-desc">全局邮件发送上限；设为 0 表示不限制。</span>
                    </template>
                    <el-input-number
                      v-model="siteFeatureForm.emailDailyLimit"
                      :min="0"
                      :step="10"
                      controls-position="right"
                      class="full-control"
                    />
                  </el-form-item>
                </template>
              </div>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="服务功能" :name="SERVICE_FEATURES_TAB">
            <div class="tab-head">
              <div>
                <h3>服务功能开关</h3>
                <p>
                  管理与部署服务直接相关的能力：文件落盘方式与本机上传限制。
                </p>
              </div>
              <el-button
                type="primary"
                :loading="siteFeatureSaving"
                @click="saveStorageFeatures"
              >
                保存服务功能
              </el-button>
            </div>

            <el-form v-loading="siteFeatureLoading" label-position="top" class="config-form">
              <div class="field-list">
                <el-form-item class="field-item">
                  <template #label>
                    <span class="field-label">存储模式</span>
                    <span class="field-desc">七牛云对象存储或服务器本机磁盘；本机模式依赖服务端可写 upload 目录。</span>
                  </template>
                  <el-select v-model="siteFeatureForm.storageMode" class="full-control">
                    <el-option label="七牛云对象存储" value="qiniu" />
                    <el-option label="本机磁盘" value="local" />
                  </el-select>
                </el-form-item>

                <el-form-item class="field-item">
                  <template #label>
                    <span class="field-label">当前本机存储目录</span>
                    <span class="field-desc">服务端运行时的 upload 绝对路径；本机模式上传的文件会落在这里。</span>
                  </template>
                  <div class="readonly-path-control">
                    <span class="readonly-path-text">{{ storageInfo.uploadDir || '-' }}</span>
                    <el-button
                      :icon="CopyDocument"
                      :disabled="!storageInfo.uploadDir"
                      @click="copyStorageDir"
                    >
                      复制
                    </el-button>
                  </div>
                </el-form-item>

                <el-form-item class="field-item">
                  <template #label>
                    <span class="field-label">本机单文件上限</span>
                    <span class="field-desc">单位：MB。仅存储模式为本机时生效，限制直传单个文件大小。</span>
                  </template>
                  <div class="unit-control">
                    <el-input-number
                      v-model="siteFeatureForm.maxUploadSizeMB"
                      :min="1"
                      :step="1"
                      controls-position="right"
                      class="full-control"
                    />
                    <span class="unit-label">MB</span>
                  </div>
                </el-form-item>
              </div>
            </el-form>
          </el-tab-pane>

          <el-tab-pane
            v-if="showMysqlToolTabs"
            label="MySQL · 在线库表"
            :name="MYSQL_INTROSPECT_TAB"
          >
            <div class="tab-head">
              <div>
                <h3>MySQL 在线库表与结构脚本</h3>
                <p>
                  上半部分与发布包内 <code>mysql-schema.json</code> 对照，可预览整库建表 SQL、检测漂移并一键对齐；下半部分读取当前连接库的真实结构（可与上方对照）。
                </p>
              </div>
              <el-button :loading="schemaLoading || mysqlLiveLoading" :icon="Refresh" @click="refreshMysqlToolsTab">
                刷新
              </el-button>
            </div>

            <div class="mysql-merged-section mysql-tool-block mysql-tool-block--solo">
              <div class="mysql-merged-section__head">
                <h4 class="mysql-merged-section__title">
                  结构与脚本
                </h4>
                <p class="mysql-merged-section__desc">
                  基于 canonical 定义检测缺表、缺列与类型漂移；弹窗可预览完整建库 SQL。
                </p>
              </div>
              <div v-loading="schemaLoading" class="mysql-schema-hints mysql-schema-hints--in-tab">
                <template v-if="mysqlSchema">
                  <div v-if="!mysqlSchema.error" class="mysql-export-actions">
                    <el-button size="small" :loading="mysqlExportLoading" @click="openMysqlExportDialog">
                      预览建表 SQL（全屏）
                    </el-button>
                    <span class="mysql-export-actions__hint">
                      弹窗内可浏览、框选复制片段，或使用「复制全部」。
                    </span>
                  </div>
                  <el-alert
                    v-if="mysqlSchema.error"
                    :closable="false"
                    show-icon
                    type="error"
                    title="MySQL schema 检测失败"
                    class="mysql-schema-alert"
                  >
                    <p>{{ mysqlSchema.error }}</p>
                  </el-alert>
                  <el-alert
                    v-else-if="mysqlSchema.pending"
                    type="warning"
                    :closable="false"
                    show-icon
                    class="mysql-schema-alert"
                  >
                    <div class="schema-drift-body">
                      <p>当前数据库与发布包 docs/schema/mysql-schema.json 期望结构不一致。</p>
                      <p v-if="(mysqlSchema.missingTables ?? []).length" style="margin: 8px 0 0 0;">
                        <strong>缺表：</strong>
                      </p>
                      <ul v-if="(mysqlSchema.missingTables ?? []).length">
                        <li v-for="t in (mysqlSchema.missingTables ?? [])" :key="t">
                          {{ t }}
                        </li>
                      </ul>
                      <p v-if="(mysqlSchema.missingColumns ?? []).length" style="margin: 8px 0 0 0;">
                        <strong>缺列：</strong>
                      </p>
                      <ul v-if="(mysqlSchema.missingColumns ?? []).length">
                        <li v-for="c in mysqlSchema.missingColumns" :key="`${c.table}.${c.column}`">
                          {{ c.table }}.{{ c.column }}
                        </li>
                      </ul>
                      <p v-if="(mysqlSchema.typeMismatches ?? []).length" style="margin: 8px 0 0 0;">
                        <strong>列类型不符（normalized）：</strong>
                      </p>
                      <ul v-if="(mysqlSchema.typeMismatches ?? []).length">
                        <li v-for="m in mysqlSchema.typeMismatches" :key="`${m.table}.${m.column}`">
                          {{ m.table }}.{{ m.column }}
                          ：库 {{ m.actualComparable }} /
                          期望 {{ m.expectedComparable }}
                        </li>
                      </ul>
                      <el-button type="primary" :loading="schemaLoading" style="margin-top: 8px" @click="applyMysqlSchema">
                        一键对齐表结构
                      </el-button>
                    </div>
                  </el-alert>
                  <el-alert
                    v-else-if="!mysqlSchema.autoSyncSchemaOnStartup"
                    type="info"
                    :closable="false"
                    show-icon
                    title="未开启启动时自动同步"
                    class="mysql-schema-alert"
                  >
                    <p style="margin: 0 0 8px 0;">
                      当前关闭「启动时自动补齐表结构」；建议在版本升级后轮询此处并手动执行对齐。
                    </p>
                    <el-button size="small" type="primary" :loading="schemaLoading" @click="applyMysqlSchema">
                      检查并补齐表结构
                    </el-button>
                  </el-alert>
                </template>
              </div>
            </div>

            <div class="mysql-tool-block mysql-tool-block--solo mysql-merged-section mysql-merged-section--live">
              <div class="mysql-merged-section__head">
                <h4 class="mysql-merged-section__title">
                  在线库表
                </h4>
                <p class="mysql-merged-section__desc">
                  读取 information_schema（InnoDB 行数为估算）；每张表含字段、索引与 SHOW CREATE TABLE。
                </p>
              </div>
              <div v-loading="mysqlLiveLoading" class="mysql-live-panel">
                <el-alert
                  v-if="mysqlLive?.error"
                  type="error"
                  :closable="false"
                  show-icon
                  title="无法读取库表信息"
                >
                  <p>{{ mysqlLive.error }}</p>
                </el-alert>
                <template v-else-if="mysqlLive">
                  <p class="mysql-live-summary">
                    <span>MySQL {{ mysqlLive.mysqlVersion }}</span>
                    <span>库 <strong>{{ mysqlLive.database }}</strong></span>
                    <span>共 {{ mysqlLive.tables.length }} 张表</span>
                  </p>
                  <el-empty v-if="!mysqlLive.tables.length" description="当前库中暂无业务表" />
                  <el-collapse v-else v-model="mysqlLiveOpenNames" class="mysql-live-collapse">
                    <el-collapse-item v-for="tbl in mysqlLive.tables" :key="tbl.name" :name="tbl.name">
                      <template #title>
                        <span class="mysql-live-collapse-title">
                          <strong>{{ tbl.name }}</strong>
                          <span class="mysql-live-collapse-meta">
                            {{ tbl.engine || '—' }}
                            <span v-if="tbl.rowEstimate != null"> · 约 {{ tbl.rowEstimate.toLocaleString() }} 行</span>
                            <span v-if="tbl.dataLength != null"> · 数据 {{ formatBytes(tbl.dataLength) }}</span>
                            <span v-if="tbl.indexLength != null"> · 索引 {{ formatBytes(tbl.indexLength) }}</span>
                          </span>
                        </span>
                      </template>

                      <div class="mysql-live-block">
                        <h4>字段</h4>
                        <el-table :data="tbl.columns" size="small" border stripe class="mysql-live-table">
                          <el-table-column prop="name" label="列名" min-width="120" />
                          <el-table-column prop="columnType" label="类型" min-width="140" />
                          <el-table-column label="可空" width="72" align="center">
                            <template #default="{ row }">
                              {{ row.nullable ? 'YES' : 'NO' }}
                            </template>
                          </el-table-column>
                          <el-table-column prop="key" label="键" width="84" />
                          <el-table-column label="默认值" min-width="100" show-overflow-tooltip>
                            <template #default="{ row }">
                              {{ row.default ?? 'NULL' }}
                            </template>
                          </el-table-column>
                          <el-table-column prop="extra" label="额外" width="120" />
                          <el-table-column prop="comment" label="注释" min-width="120" show-overflow-tooltip />
                        </el-table>
                      </div>

                      <div class="mysql-live-block">
                        <h4>索引</h4>
                        <el-table v-if="tbl.indexes.length" :data="tbl.indexes" size="small" border stripe class="mysql-live-table">
                          <el-table-column prop="name" label="索引名" min-width="120" />
                          <el-table-column label="唯一" width="72" align="center">
                            <template #default="{ row }">
                              {{ row.unique ? '是' : '否' }}
                            </template>
                          </el-table-column>
                          <el-table-column prop="indexType" label="类型" width="100" />
                          <el-table-column label="列（序）" min-width="200">
                            <template #default="{ row }">
                              {{ indexColumnsLabel(row) }}
                            </template>
                          </el-table-column>
                        </el-table>
                        <p v-else class="mysql-live-muted">
                          无二级索引（或仅剩主键于信息模式中已展示于「键」列）
                        </p>
                      </div>

                      <div class="mysql-live-block">
                        <div class="mysql-live-ddl-head">
                          <h4>SHOW CREATE TABLE</h4>
                          <el-button size="small" @click="copyMysqlTableDdl(tbl)">
                            复制建表 SQL
                          </el-button>
                        </div>
                        <el-input
                          :model-value="tbl.createSql"
                          type="textarea"
                          readonly
                          :rows="10"
                          class="mysql-live-ddl"
                          spellcheck="false"
                        />
                      </div>
                    </el-collapse-item>
                  </el-collapse>
                </template>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="系统管理员" :name="CONFIG_ADMIN_USERS_TAB">
            <div class="tab-head">
              <div>
                <h3>系统管理员账号</h3>
                <p>
                  来自业务库 <code>user</code> 表，列出超级管理员与系统管理员。<strong>系统管理员与超级管理员</strong>均可在此新增超级管理员、重置管理员密码；新增规则与「注册」一致（不受站点「关闭注册」影响）。
                </p>
              </div>
              <el-button :loading="adminUsersLoading" :icon="Refresh" @click="loadAdminUsers">
                刷新列表
              </el-button>
            </div>
            <div v-loading="adminUsersLoading" class="admin-users-panel">
              <el-table :data="adminUsersList" size="small" border stripe class="admin-users-table">
                <el-table-column prop="account" label="账号" min-width="120" />
                <el-table-column prop="powerLabel" label="权限" width="120" />
                <el-table-column prop="phoneMasked" label="手机号" min-width="120" />
                <el-table-column label="状态" width="88">
                  <template #default="{ row }">
                    {{ adminStatusLabel(row.status) }}
                  </template>
                </el-table-column>
                <el-table-column label="注册时间" min-width="160" show-overflow-tooltip>
                  <template #default="{ row }">
                    {{ row.joinTime || '—' }}
                  </template>
                </el-table-column>
                <el-table-column v-if="canOperateConfigAdmins" label="操作" width="100" fixed="right">
                  <template #default="{ row }">
                    <el-button type="primary" link size="small" @click="openAdminResetDialog(row)">
                      重置密码
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>

              <div v-if="canOperateConfigAdmins" class="mysql-tool-block mysql-tool-block--solo admin-create-block">
                <h3 class="mysql-tool-block__title">
                  新增超级管理员
                </h3>
                <p class="mysql-tool-block__desc">
                  创建后账号权限为「超级管理员」。若站点开启须绑定手机，则需按注册流程校验手机号。
                </p>
                <el-form label-position="top" class="admin-create-form">
                  <div class="admin-create-grid">
                    <el-form-item label="登录账号">
                      <el-input v-model="adminCreateForm.account" maxlength="11" placeholder="4-11 位数字或字母" clearable />
                    </el-form-item>
                    <el-form-item label="密码">
                      <el-input v-model="adminCreateForm.pwd1" type="password" show-password clearable />
                    </el-form-item>
                    <el-form-item label="确认密码">
                      <el-input v-model="adminCreateForm.pwd2" type="password" show-password clearable />
                    </el-form-item>
                    <el-form-item label="绑定手机">
                      <el-checkbox v-model="adminCreateForm.bindPhone" :disabled="siteConfig?.needBindPhone">
                        绑定手机号（与注册一致）
                      </el-checkbox>
                    </el-form-item>
                    <template v-if="adminCreateForm.bindPhone">
                      <el-form-item label="手机号">
                        <el-input v-model="adminCreateForm.phone" maxlength="11" clearable />
                      </el-form-item>
                      <el-form-item label="验证码">
                        <div class="code-row">
                          <el-input v-model="adminCreateForm.code" maxlength="4" clearable />
                          <el-button :disabled="adminCodeTime > 0" @click="getAdminCreateCode">
                            {{ adminCodeText }}
                          </el-button>
                        </div>
                      </el-form-item>
                    </template>
                  </div>
                  <el-button type="primary" :loading="adminCreateSubmitting" @click="submitCreateAdminUser">
                    创建超级管理员
                  </el-button>
                </el-form>
              </div>
            </div>

            <el-dialog
              v-model="adminResetVisible"
              title="重置管理员密码"
              width="420px"
              destroy-on-close
              @closed="closeAdminResetDialog"
            >
              <p v-if="adminResetRow" class="admin-reset-hint">
                账号 <strong>{{ adminResetRow.account }}</strong>（{{ adminResetRow.powerLabel }}）
              </p>
              <el-form label-position="top" class="admin-reset-form">
                <el-form-item label="新密码">
                  <el-input v-model="adminResetPwd1" type="password" show-password clearable autocomplete="new-password" />
                </el-form-item>
                <el-form-item label="确认新密码">
                  <el-input v-model="adminResetPwd2" type="password" show-password clearable autocomplete="new-password" />
                </el-form-item>
              </el-form>
              <template #footer>
                <el-button @click="closeAdminResetDialog">
                  取消
                </el-button>
                <el-button type="primary" :loading="adminResetSubmitting" @click="submitAdminResetPassword">
                  确定重置
                </el-button>
              </template>
            </el-dialog>
          </el-tab-pane>
        </el-tabs>

        <div v-if="currentConfig" class="bottom-actions-row">
          <p class="bottom-actions-hint">
            与当前 Tab 右上角「保存 {{ getConfigTabLabel(currentConfig) }}」是同一功能；表单项较多时滚到此处保存即可。
          </p>
          <el-button
            type="primary"
            :loading="getConfigSaving(currentConfig)"
            @click="saveConfigGroup(currentConfig)"
          >
            {{ isSmtpConfig(currentConfig) ? '保存邮箱配置' : isTxConfig(currentConfig) ? '保存腾讯云配置' : '保存当前服务配置' }}
          </el-button>
        </div>
        <div v-else-if="activeConfigTab === SERVICE_FEATURES_TAB" class="bottom-actions-row">
          <p class="bottom-actions-hint">
            与当前 Tab 右上角「保存服务功能」是同一功能；表单项较多时滚到此处保存即可。
          </p>
          <el-button
            type="primary"
            :loading="siteFeatureSaving"
            @click="saveStorageFeatures"
          >
            保存服务功能
          </el-button>
        </div>
      </div>
    </section>

    <el-dialog
      v-model="mailTestDialogVisible"
      title="测试邮箱"
      width="560px"
      destroy-on-close
      :close-on-click-modal="!mailTestSubmitting"
      @closed="closeMailTestDialog"
    >
      <el-form label-position="top" class="mail-test-form">
        <el-form-item label="接收邮箱">
          <el-input
            v-model="mailTestForm.to"
            placeholder="test@example.com"
            clearable
            @keyup.enter="submitMailTest"
          />
        </el-form-item>
        <el-form-item label="测试场景">
          <el-checkbox-group v-model="mailTestForm.scenes" class="mail-test-scenes">
            <el-checkbox
              v-for="scene in mailTestSceneOptions"
              :key="scene.key"
              :label="scene.key"
              class="mail-test-scene"
            >
              <span class="mail-test-scene__label">{{ scene.label }}</span>
              <span class="mail-test-scene__desc">{{ scene.description }}</span>
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>

      <el-alert
        v-if="mailTestError"
        class="mail-test-alert"
        type="error"
        :closable="false"
        show-icon
        :title="mailTestError"
      />

      <div v-if="mailTestResults.length" class="mail-test-results">
        <div
          v-for="item in mailTestResults"
          :key="item.key"
          class="mail-test-result"
          :class="{ 'mail-test-result--error': !item.ok }"
        >
          <strong>{{ item.label }}</strong>
          <span>{{ item.ok ? '发送成功' : item.error || '发送失败' }}</span>
        </div>
      </div>

      <p class="mail-test-hint">
        测试会真实发送邮件，也会计入每日发信上限；若刚修改 SMTP 或邮箱功能配置，请先保存后再测试。
      </p>

      <template #footer>
        <el-button :disabled="mailTestSubmitting" @click="closeMailTestDialog">
          关闭
        </el-button>
        <el-button type="primary" :loading="mailTestSubmitting" @click="submitMailTest">
          发送测试邮件
        </el-button>
      </template>
    </el-dialog>

    <Teleport to="body">
      <div
        v-if="mysqlExportDialogVisible"
        class="mysql-export-fs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mysql-export-fs-title"
      >
        <div class="mysql-export-fs__shell">
          <header class="mysql-export-fs__head">
            <h2 id="mysql-export-fs-title" class="mysql-export-fs__title">
              完整建表 SQL（mysql-schema.json）
            </h2>
            <div class="mysql-export-fs__head-actions">
              <el-button size="small" @click="closeMysqlExportDialog">
                关闭
              </el-button>
            </div>
          </header>
          <div v-loading="mysqlExportLoading" class="mysql-export-fs__main">
            <el-alert
              v-if="mysqlExportError"
              type="error"
              :closable="false"
              show-icon
              :title="mysqlExportError"
            />
            <template v-else>
              <p v-if="mysqlExportDescription" class="mysql-export-fs__desc">
                {{ mysqlExportDescription }}
              </p>
              <p class="mysql-export-fs__hint">
                在下方可直接框选复制局部语句；需要整段请点底部「复制全部」。
              </p>
              <textarea
                v-model="mysqlExportSql"
                readonly
                spellcheck="false"
                class="mysql-export-fs__textarea"
                placeholder="正在加载…"
              />
            </template>
          </div>
          <footer class="mysql-export-fs__foot">
            <el-button @click="closeMysqlExportDialog">
              关闭
            </el-button>
            <el-button
              type="primary"
              :disabled="!mysqlExportSql.trim() || !!mysqlExportError"
              @click="copyMysqlExportSqlAll"
            >
              复制全部
            </el-button>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.config-page {
  max-width: 1256px;
  margin: 10px auto;
  color: #1f2937;
}

.hero-card,
.panel {
  box-sizing: border-box;
  border: 1px solid #edf0f5;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 30px rgb(31 41 55 / 8%);
}

.hero-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 32px;
  overflow: hidden;
  background:
    radial-gradient(circle at 88% 20%, rgb(64 158 255 / 18%), transparent 28%),
    linear-gradient(135deg, #fff 0%, #f6f9ff 100%);

  h1 {
    margin: 6px 0 10px;
    font-size: 30px;
    line-height: 1.2;
  }
}

.eyebrow {
  margin: 0;
  color: #409eff;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.hero-desc {
  max-width: 640px;
  margin: 0;
  color: #6b7280;
  line-height: 1.7;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, 92px);
  gap: 10px;

  div {
    display: grid;
    place-items: center;
    min-height: 92px;
    border-radius: 20px;
    background: rgb(255 255 255 / 74%);
    box-shadow: inset 0 0 0 1px rgb(64 158 255 / 12%);
  }

  strong {
    color: #2563eb;
    font-size: 32px;
    line-height: 1;
  }

  span {
    color: #6b7280;
    font-size: 13px;
  }
}

.panel {
  margin-top: 18px;
  padding: 24px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;

  &.compact {
    margin-bottom: 12px;
  }

  h2 {
    margin: 0 0 6px;
    font-size: 20px;
  }

  p {
    margin: 0;
    color: #6b7280;
    line-height: 1.6;
  }
}

.service-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}

.service-card {
  padding: 16px;
  border: 1px solid #e8edf5;
  border-radius: 14px;
  background: #fbfdff;

  &.error {
    background: #fff8f8;
  }
}

.service-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  h3 {
    margin: 0 0 6px;
    font-size: 17px;
  }

  p {
    margin: 0;
    color: #6b7280;
    font-size: 13px;
    line-height: 1.5;
  }
}

.service-meta {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  color: #8a94a6;
  font-size: 13px;
}

.error-text,
.error-list span {
  color: #d03050;
  word-break: break-all;
}

.error-list {
  display: grid;
  gap: 8px;

  p {
    margin: 0;
    line-height: 1.6;
  }
}

.config-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 14px;
  }

  :deep(.el-tabs__nav-wrap::after) {
    height: 1px;
    background-color: #edf0f5;
  }

  :deep(.el-tabs__item) {
    height: 36px;
    padding: 0 18px;
    color: #6b7280;
    font-weight: 700;
  }
}

.tab-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #f7faff;

  h3 {
    margin: 0 0 5px;
    font-size: 16px;
  }

  p {
    margin: 0;
    color: #6b7280;
    line-height: 1.5;
  }
}

.tab-head-actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.field-list {
  display: grid;
  gap: 12px;
}

.field-list--grouped {
  gap: 10px;
}

.config-subsection {
  margin-top: 2px;
  padding: 12px 14px;
  border: 1px solid #edf0f5;
  border-radius: 12px;
  background: #fbfdff;

  &--spaced {
    margin-top: 10px;
  }
}

.config-subsection__head {
  h4 {
    margin: 0 0 5px;
    color: #1f2937;
    font-size: 15px;
  }

  p {
    margin: 0;
    color: #8a94a6;
    font-size: 13px;
    line-height: 1.5;
  }
}

.config-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.field-item {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(220px, 380px);
  align-items: center;
  gap: 16px;
  padding: 12px 14px;
  border: 1px solid #edf0f5;
  border-radius: 12px;
  background: #fff;

  :deep(.el-form-item__label) {
    margin-bottom: 0;
    padding-right: 0;
    line-height: 1.4;
  }

  :deep(.el-form-item__content) {
    min-width: 0;
  }
}

.field-label,
.field-desc {
  display: block;
}

.field-label {
  color: #1f2937;
  font-size: 14px;
  font-weight: 700;
}

.field-desc {
  margin-top: 3px;
  color: #8a94a6;
  font-size: 13px;
}

.full-control {
  width: 100%;
}

.unit-control {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.readonly-path-control {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  .el-button {
    flex-shrink: 0;
  }
}

.readonly-path-text {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
  color: #374151;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.unit-label {
  flex-shrink: 0;
  color: #6b7280;
  font-size: 13px;
}

.bottom-actions-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px 16px;
  margin-top: 18px;
}

.bottom-actions-hint {
  flex: 1 1 220px;
  margin: 0;
  margin-right: auto;
  min-width: 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.5;
}

.mysql-live-panel {
  min-height: 120px;
}

.mysql-tool-block {
  margin-top: 28px;
  padding: 20px 18px;
  border: 1px solid #edf0f5;
  border-radius: 14px;
  background: #fbfdff;

  &:first-child {
    margin-top: 0;
  }
}

.mysql-tool-block__head {
  margin-bottom: 14px;

  &--row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px 20px;
  }
}

.mysql-tool-block__title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.mysql-tool-block__desc {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.5;
}

.mysql-schema-hints--in-tab {
  margin-top: 4px;
}

.mysql-export-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-bottom: 12px;
}

.mysql-export-actions__hint {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.mysql-schema-alert {
  margin-bottom: 12px;
}

.mysql-tool-block--solo {
  margin-top: 16px;
}

.mysql-merged-section {
  margin-top: 0;
}

.mysql-merged-section--live {
  margin-top: 20px;
}

.mysql-merged-section__head {
  margin-bottom: 12px;
}

.mysql-merged-section__title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.mysql-merged-section__desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #606266;
}

.admin-users-panel {
  margin-top: 8px;
}

.admin-users-table {
  width: 100%;
  margin-bottom: 24px;
}

.admin-create-block {
  margin-top: 8px;
}

.admin-create-form {
  max-width: 720px;
}

.admin-create-grid {
  display: grid;
  gap: 4px 20px;
  grid-template-columns: repeat(2, minmax(200px, 1fr));
  margin-bottom: 12px;
}

.code-row {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;

  .el-input {
    flex: 1;
  }
}

.field-hint-muted {
  margin: 6px 0 0;
  color: #8a94a6;
  font-size: 12px;
}

.admin-reset-hint {
  margin: 0 0 12px;
  color: #606266;
  font-size: 14px;
}

.mail-test-form {
  :deep(.el-form-item) {
    margin-bottom: 16px;
  }
}

.mail-test-scenes {
  display: grid;
  width: 100%;
  gap: 10px;
}

.mail-test-scene {
  width: 100%;
  min-height: 48px;
  margin-right: 0;
  padding: 10px 12px;
  border: 1px solid #edf0f5;
  border-radius: 10px;
  background: #fbfdff;

  :deep(.el-checkbox__label) {
    min-width: 0;
    white-space: normal;
  }
}

.mail-test-scene__label,
.mail-test-scene__desc {
  display: block;
}

.mail-test-scene__label {
  color: #1f2937;
  font-weight: 700;
  line-height: 1.4;
}

.mail-test-scene__desc {
  margin-top: 2px;
  color: #8a94a6;
  font-size: 12px;
  line-height: 1.4;
}

.mail-test-alert {
  margin-bottom: 12px;
}

.mail-test-results {
  display: grid;
  gap: 8px;
  margin: 2px 0 12px;
}

.mail-test-result {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid rgb(103 194 58 / 24%);
  border-radius: 10px;
  background: rgb(240 249 235 / 65%);
  color: #529b2e;
  line-height: 1.5;

  strong {
    color: #1f2937;
  }

  span {
    text-align: right;
  }

  &--error {
    border-color: rgb(245 108 108 / 24%);
    background: rgb(254 240 240 / 72%);
    color: #c45656;
  }
}

.mail-test-hint {
  margin: 0;
  color: #8a94a6;
  font-size: 13px;
  line-height: 1.6;
}

@media screen and (max-width: 700px) {
  .admin-create-grid {
    grid-template-columns: 1fr;
  }
}

.mysql-live-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  margin: 0 0 14px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.5;
}

.mysql-live-collapse {
  border: none;

  :deep(.el-collapse-item__header) {
    height: auto;
    min-height: 48px;
    padding: 10px 12px;
    line-height: 1.4;
    background: #fbfdff;
  }

  :deep(.el-collapse-item__wrap) {
    border-bottom: 1px solid #edf0f5;
  }

  :deep(.el-collapse-item__content) {
    padding-bottom: 16px;
  }
}

.mysql-live-collapse-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 14px;
  width: 100%;
  padding-right: 8px;
}

.mysql-live-collapse-meta {
  color: #8a94a6;
  font-size: 13px;
  font-weight: 400;
}

.mysql-live-block {
  margin-top: 16px;

  h4 {
    margin: 0 0 10px;
    font-size: 14px;
    color: #374151;
  }
}

.mysql-live-table {
  width: 100%;
}

.mysql-live-muted {
  margin: 0;
  color: #8a94a6;
  font-size: 13px;
}

.mysql-live-ddl-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.mysql-live-ddl {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
}

.tab-head code {
  padding: 1px 6px;
  border-radius: 4px;
  background: rgb(64 158 255 / 12%);
  font-size: 12px;
}

@media screen and (max-width: 900px) {
  .config-page {
    margin-top: 40px;
  }

  .hero-card {
    align-items: flex-start;
    flex-direction: column;
    padding: 22px;
  }

  .hero-stats {
    width: 100%;
    grid-template-columns: repeat(3, 1fr);
  }

  .field-item {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}

@media screen and (max-width: 700px) {
  .config-page {
    margin: 40px 10px 0;
  }

  .panel {
    padding: 18px;
    border-radius: 14px;
  }

  .section-head,
  .tab-head {
    display: block;
  }

  .section-head .el-button,
  .tab-head .el-button {
    width: 100%;
    margin-top: 14px;
  }

  .tab-head-actions {
    width: 100%;
    margin-top: 14px;
  }

  .tab-head-actions .el-button {
    margin-top: 0;
  }

  .hero-stats {
    grid-template-columns: 1fr;
  }

  .config-tabs :deep(.el-tabs__nav-scroll) {
    overflow-x: auto;
  }

  .field-item {
    padding: 12px;
  }

  .readonly-path-control {
    align-items: stretch;
    flex-direction: column;
  }

  .bottom-actions-row {
    flex-direction: column;
    align-items: stretch;
  }

  .bottom-actions-hint {
    margin-right: 0;
  }

  .bottom-actions-row .el-button {
    width: 100%;
  }
}
</style>

<!-- Teleport 全屏预览：挂载到 body，样式独立于 scoped -->
<style lang="scss">
.mysql-export-fs {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background: var(--el-bg-color, #fff);
}

.mysql-export-fs__shell {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  width: 100%;
  height: 100%;
  background: inherit;
}

.mysql-export-fs__head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
  box-sizing: border-box;
}

.mysql-export-fs__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.mysql-export-fs__main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 18px;
  box-sizing: border-box;
  overflow: hidden;
}

.mysql-export-fs__desc {
  margin: 0;
  flex-shrink: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.mysql-export-fs__hint {
  margin: 0;
  flex-shrink: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
}

.mysql-export-fs__textarea {
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  resize: none;
  box-sizing: border-box;
  padding: 12px 14px;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: var(--el-border-radius-base, 4px);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  tab-size: 2;
  color: var(--el-text-color-primary);
  background: var(--el-fill-color-blank, #fff);
  cursor: text;
  overflow-y: auto;
}

.mysql-export-fs__textarea:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 0;
}

.mysql-export-fs__foot {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid var(--el-border-color-lighter, #ebeef5);
  box-sizing: border-box;
}
</style>
