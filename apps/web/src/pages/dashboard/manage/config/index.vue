<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { SuperOverviewApi } from '@/apis'
import { defaultSiteConfig as baseDefaultSiteConfig, useSiteAllConfig } from '@/composables'

type SiteConfig = typeof baseDefaultSiteConfig
interface RouteItem {
  path: string
  name: string
  title: string
  disabled: boolean
}
interface ConfigField {
  key: keyof SiteConfig
  label: string
  description: string
  type: 'text' | 'textarea' | 'url' | 'number' | 'switch' | 'date' | 'select'
  suffix?: string
  maxlength?: number
  min?: number
  max?: number
  step?: number
  precision?: number
  options?: { label: string, value: string }[]
}
interface ConfigSection {
  title: string
  description: string
  fields: ConfigField[]
}

const defaultSiteConfig: SiteConfig = { ...baseDefaultSiteConfig }
const ANNOUNCEMENT_TAB = '通告配置'
const announcementThemeOptions: Array<{
  label: string
  value: OverviewApiTypes.SiteAnnouncementTheme
}> = [
  { label: '信息蓝', value: 'info' },
  { label: '成功绿', value: 'success' },
  { label: '提醒黄', value: 'warning' },
  { label: '警示红', value: 'danger' },
]

const configSections: ConfigSection[] = [
  {
    title: '基础体验',
    description: '控制站点名称、表单规模和用户可输入内容。',
    fields: [
      { key: 'appName', label: '应用名称', description: '展示在前台页面的产品名称。', type: 'text' },
      { key: 'maxInputLength', label: '输入长度上限', description: '单个表单项允许输入的最大字符数。', type: 'number', min: 1, step: 1 },
      { key: 'formLength', label: '表单项数量', description: '用户创建取件表单时可配置的字段数量。', type: 'number', min: 1, step: 1 },
      { key: 'openPraise', label: '赞赏提示', description: '是否在前台显示赞赏相关提示文案。', type: 'switch' },
      { key: 'feedbackEntryEnabled', label: '问题反馈入口', description: '是否在页面右下角展示问题反馈浮动入口。', type: 'switch' },
      { key: 'filePageFloatingContactEnabled', label: '右下角联系入口', description: '开启后在文件页和任务页右下角固定展示联系作者快捷入口。', type: 'switch' },
    ],
  },
  {
    title: '上传与下载',
    description: '管理文件下载有效期和压缩包大小限制。',
    fields: [
      { key: 'downloadOneExpired', label: '单文件链接有效期', description: '单个文件下载链接的过期时间。', type: 'number', min: 1, step: 1, suffix: '分钟' },
      { key: 'downloadCompressExpired', label: '归档链接有效期', description: '打包下载链接的过期时间。', type: 'number', min: 1, step: 1, suffix: '分钟' },
      { key: 'compressSizeLimit', label: '压缩包大小限制', description: '允许创建压缩包的最大体积。', type: 'number', min: 1, step: 1, suffix: 'GB' },
      { key: 'storageMode', label: '存储模式', description: '七牛云对象存储或服务器本机磁盘；本机模式需部署可写数据目录。', type: 'select', options: [{ label: '七牛云', value: 'qiniu' }, { label: '本机磁盘', value: 'local' }] },
      { key: 'maxUploadSizeMB', label: '本机单文件上限', description: '单位：MB。仅存储模式为本机时，限制直传单个文件大小。', type: 'number', min: 1, step: 1, suffix: 'MB' },
    ],
  },
  {
    title: '访问限制',
    description: '控制用户使用前的校验与资源限制策略。',
    fields: [
      { key: 'needBindPhone', label: '强制绑定手机号', description: '开启后用户需要先绑定手机号。', type: 'switch' },
      { key: 'enableCodeLogin', label: '验证码登录', description: '开启后且腾讯云短信配置完整时，前台展示验证码登录入口。', type: 'switch' },
      { key: 'enableEmailCodeLogin', label: '邮箱验证码', description: '开启且 SMTP 可用时，支持邮箱验证码登录、注册与找回密码。', type: 'switch' },
      { key: 'limitSpace', label: '限制存储空间', description: '开启后按用户空间额度限制上传。', type: 'switch' },
      { key: 'limitWallet', label: '限制钱包余额', description: '开启后按钱包余额限制资源消耗。', type: 'switch' },
    ],
  },
  {
    title: '成本计费',
    description: '配置七牛云与压缩相关的成本计算参数。',
    fields: [
      { key: 'moneyStartDay', label: '计费开始日期', description: '费用统计从该日期开始计算。', type: 'date' },
      { key: 'qiniuOSSPrice', label: '七牛云存储单价', description: '对象存储计费单价。', type: 'number', min: 0, step: 0.001, precision: 3, suffix: '元/GB' },
      { key: 'qiniuCDNPrice', label: '七牛云 CDN 单价', description: 'CDN 流量计费单价。', type: 'number', min: 0, step: 0.001, precision: 3, suffix: '元/GB' },
      { key: 'qiniuBackhaulTrafficPrice', label: '回源流量单价', description: '回源流量计费单价。', type: 'number', min: 0, step: 0.001, precision: 3, suffix: '元/GB' },
      { key: 'qiniuBackhaulTrafficPercentage', label: '回源流量占比', description: '用于估算回源流量的比例。', type: 'number', min: 0, max: 1, step: 0.01, precision: 2 },
      { key: 'qiniuCompressPrice', label: '压缩处理单价', description: '压缩服务的成本单价。', type: 'number', min: 0, step: 0.001, precision: 3, suffix: '元/GB' },
    ],
  },
  {
    title: '文件页提示',
    description: '配置文件列表页的赞赏提示、联系入口和资源限制说明。',
    fields: [
      { key: 'filePagePraiseText', label: '赞赏前置文案', description: '展示在赞赏链接前的说明。', type: 'textarea', maxlength: 120 },
      { key: 'filePagePraiseLinkText', label: '赞赏链接文案', description: '赞赏入口的链接文字。', type: 'textarea', maxlength: 80 },
      { key: 'filePagePraiseLink', label: '赞赏链接', description: '点击赞赏入口后打开的地址。', type: 'url', maxlength: 300 },
      { key: 'filePageContactText', label: '联系前置文案', description: '展示在联系入口前的说明。', type: 'textarea', maxlength: 120 },
      { key: 'filePageContactLinkText', label: '联系链接文案', description: '联系入口的链接文字。', type: 'textarea', maxlength: 80 },
      { key: 'filePageContactLink', label: '联系链接', description: '点击联系入口后打开的地址。', type: 'url', maxlength: 300 },
      { key: 'filePageLimitText', label: '限制说明', description: '赞赏提示开启时展示的资源限制说明。', type: 'textarea', maxlength: 300 },
      { key: 'filePageSponsorText', label: '赞助说明前缀', description: '展示在赞助联系链接前的文案。', type: 'textarea', maxlength: 120 },
      { key: 'filePageSponsorLinkText', label: '赞助链接文案', description: '赞助联系入口的链接文字。', type: 'textarea', maxlength: 100 },
      { key: 'filePageSponsorLink', label: '赞助链接', description: '点击赞助联系入口后打开的地址。', type: 'url', maxlength: 300 },
      { key: 'filePageSponsorSuffix', label: '赞助说明后缀', description: '展示在赞助联系链接后的文案。', type: 'textarea', maxlength: 120 },
      { key: 'filePageSelfHostLinkText', label: '自建链接文案', description: '自建文档入口的链接文字。', type: 'textarea', maxlength: 100 },
      { key: 'filePageSelfHostLink', label: '自建链接', description: '点击自建文档入口后打开的地址。', type: 'url', maxlength: 300 },
    ],
  },
]

const $router = useRouter()
const routes = computed(() =>
  $router.options.routes.filter(v => v.meta?.allowDisabled),
)
const showRoutes = reactive<RouteItem[]>([])
const enabledRouteCount = computed(() => showRoutes.filter(route => !route.disabled).length)

const siteFormRef = ref<FormInstance>()
const saving = ref(false)
const activeConfigTab = ref(configSections[0].title)
const siteForm = reactive<SiteConfig>({ ...defaultSiteConfig })
const { value: jsonData, updateValue: updateJsonData } = useSiteAllConfig()
const configFieldMap = new Map(
  configSections
    .flatMap(section => section.fields)
    .map(field => [field.key, field]),
)

const rules: FormRules = {
  appName: [{ required: true, message: '请输入应用名称', trigger: 'blur' }],
  maxInputLength: [{ required: true, message: '请输入输入长度上限', trigger: 'blur' }],
  formLength: [{ required: true, message: '请输入表单项数量', trigger: 'blur' }],
  downloadOneExpired: [{ required: true, message: '请输入单文件链接有效期', trigger: 'blur' }],
  downloadCompressExpired: [{ required: true, message: '请输入归档链接有效期', trigger: 'blur' }],
  compressSizeLimit: [{ required: true, message: '请输入压缩包大小限制', trigger: 'blur' }],
  maxUploadSizeMB: [{ required: true, message: '请输入本机单文件上限', trigger: 'blur' }],
  moneyStartDay: [{ required: true, message: '请选择计费开始日期', trigger: 'change' }],
}

function syncForm(data: Partial<SiteConfig> = {}) {
  Object.assign(siteForm, {
    ...defaultSiteConfig,
    ...data,
    announcementTop: {
      ...defaultSiteConfig.announcementTop,
      ...(data.announcementTop || {}),
    },
    announcementModal: {
      ...defaultSiteConfig.announcementModal,
      ...(data.announcementModal || {}),
    },
  })
}

function normalizeSiteConfig(): SiteConfig {
  return {
    ...defaultSiteConfig,
    ...jsonData.value,
    appName: siteForm.appName.trim(),
    maxInputLength: Number(siteForm.maxInputLength),
    openPraise: Boolean(siteForm.openPraise),
    feedbackEntryEnabled: Boolean(siteForm.feedbackEntryEnabled),
    formLength: Number(siteForm.formLength),
    downloadOneExpired: Number(siteForm.downloadOneExpired),
    downloadCompressExpired: Number(siteForm.downloadCompressExpired),
    compressSizeLimit: Number(siteForm.compressSizeLimit),
    needBindPhone: Boolean(siteForm.needBindPhone),
    enableCodeLogin: Boolean(siteForm.enableCodeLogin),
    enableSmtp: typeof jsonData.value.enableSmtp === 'boolean'
      ? Boolean(siteForm.enableSmtp)
      : Boolean(siteForm.enableEmailCodeLogin || siteForm.needBindEmail),
    enableEmailCodeLogin: Boolean(siteForm.enableEmailCodeLogin),
    storageMode: siteForm.storageMode === 'local' ? 'local' : 'qiniu',
    maxUploadSizeMB: Number(siteForm.maxUploadSizeMB),
    limitSpace: Boolean(siteForm.limitSpace),
    limitWallet: Boolean(siteForm.limitWallet),
    qiniuOSSPrice: Number(siteForm.qiniuOSSPrice),
    qiniuCDNPrice: Number(siteForm.qiniuCDNPrice),
    qiniuBackhaulTrafficPrice: Number(siteForm.qiniuBackhaulTrafficPrice),
    qiniuBackhaulTrafficPercentage: Number(siteForm.qiniuBackhaulTrafficPercentage),
    qiniuCompressPrice: Number(siteForm.qiniuCompressPrice),
    moneyStartDay: Number(siteForm.moneyStartDay),
    filePagePraiseText: siteForm.filePagePraiseText.trim(),
    filePagePraiseLinkText: siteForm.filePagePraiseLinkText.trim(),
    filePagePraiseLink: siteForm.filePagePraiseLink.trim(),
    filePageContactText: siteForm.filePageContactText.trim(),
    filePageContactLinkText: siteForm.filePageContactLinkText.trim(),
    filePageContactLink: siteForm.filePageContactLink.trim(),
    filePageFloatingContactEnabled: Boolean(siteForm.filePageFloatingContactEnabled),
    filePageLimitText: siteForm.filePageLimitText.trim(),
    filePageSponsorText: siteForm.filePageSponsorText.trim(),
    filePageSponsorLinkText: siteForm.filePageSponsorLinkText.trim(),
    filePageSponsorLink: siteForm.filePageSponsorLink.trim(),
    filePageSponsorSuffix: siteForm.filePageSponsorSuffix.trim(),
    filePageSelfHostLinkText: siteForm.filePageSelfHostLinkText.trim(),
    filePageSelfHostLink: siteForm.filePageSelfHostLink.trim(),
    announcementTop: {
      enabled: Boolean(siteForm.announcementTop.enabled),
      title: siteForm.announcementTop.title.trim(),
      content: siteForm.announcementTop.content.trim(),
      renderHtml: Boolean(siteForm.announcementTop.renderHtml),
      theme: siteForm.announcementTop.theme,
      closable: Boolean(siteForm.announcementTop.closable),
    },
    announcementModal: {
      enabled: Boolean(siteForm.announcementModal.enabled),
      title: siteForm.announcementModal.title.trim() || '通告',
      content: siteForm.announcementModal.content.trim(),
      renderHtml: Boolean(siteForm.announcementModal.renderHtml),
      theme: siteForm.announcementModal.theme,
      showTimes: Number(siteForm.announcementModal.showTimes),
      confirmText: siteForm.announcementModal.confirmText.trim() || '知道了',
    },
  }
}

function getFieldValue(key: keyof SiteConfig) {
  return siteForm[key]
}

function updateFieldValue(key: keyof SiteConfig, value: string | number | boolean) {
  siteForm[key] = value as never
}

function handleChangeRoute(route: RouteItem) {
  SuperOverviewApi.addDisabledRoute(route.path, !route.disabled).then(() => {
    route.disabled = !route.disabled
    ElMessage.success('切换成功')
  })
}

function handleResetConfig() {
  syncForm(jsonData.value)
  ElMessage.info('已恢复为当前线上配置')
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatConfirmValue(key: keyof SiteConfig, value: SiteConfig[keyof SiteConfig]) {
  const field = configFieldMap.get(key)
  if (field?.type === 'switch') {
    return value ? '开启' : '关闭'
  }
  if (field?.type === 'date') {
    return Number.isNaN(Number(value))
      ? '-'
      : new Date(Number(value)).toLocaleDateString()
  }
  if (value && typeof value === 'object') {
    const text = JSON.stringify(value)
    return text.length > 120 ? `${text.slice(0, 120)}...` : text
  }
  const text = String(value ?? '')
  return text.length > 120 ? `${text.slice(0, 120)}...` : text
}

function isSameConfigValue(a: unknown, b: unknown) {
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b)
  }
  return a === b
}

function getConfigChangeLabel(key: keyof SiteConfig) {
  if (key === 'announcementTop')
    return '顶部条通告'
  if (key === 'announcementModal')
    return '弹窗通告'
  return configFieldMap.get(key)?.label || key
}

function getConfigChanges(nextConfig: SiteConfig) {
  const currentConfig: SiteConfig = {
    ...defaultSiteConfig,
    ...jsonData.value,
  }
  return Object.keys(defaultSiteConfig)
    .map((key) => {
      const typedKey = key as keyof SiteConfig
      const oldValue = currentConfig[typedKey]
      const newValue = nextConfig[typedKey]
      if (isSameConfigValue(oldValue, newValue)) {
        return null
      }
      return {
        key: typedKey,
        label: getConfigChangeLabel(typedKey),
        oldValue: formatConfirmValue(typedKey, oldValue),
        newValue: formatConfirmValue(typedKey, newValue),
      }
    })
    .filter(Boolean)
}

function buildChangeConfirmContent(changes: NonNullable<ReturnType<typeof getConfigChanges>[number]>[]) {
  const list = changes
    .map((change) => {
      return `<li><strong>${escapeHtml(String(change.label))}</strong>：<span>${escapeHtml(change.oldValue)}</span> → <span>${escapeHtml(change.newValue)}</span></li>`
    })
    .join('')

  return `<div class="config-change-confirm">
    <p>本次将修改以下 ${changes.length} 项配置，请确认后再提交：</p>
    <ul>${list}</ul>
  </div>`
}

function validateAnnouncementConfig() {
  if (siteForm.announcementTop.enabled && !siteForm.announcementTop.content.trim()) {
    ElMessage.warning('请填写顶部条通告内容')
    activeConfigTab.value = ANNOUNCEMENT_TAB
    return false
  }
  if (siteForm.announcementModal.enabled && !siteForm.announcementModal.content.trim()) {
    ElMessage.warning('请填写弹窗通告内容')
    activeConfigTab.value = ANNOUNCEMENT_TAB
    return false
  }
  if (siteForm.announcementModal.showTimes < 1) {
    ElMessage.warning('弹窗展示次数需大于 0')
    activeConfigTab.value = ANNOUNCEMENT_TAB
    return false
  }
  return true
}

async function handleSaveConfig() {
  try {
    await siteFormRef.value?.validate()
  }
  catch {
    ElMessage.error('保存失败，请检查配置项后重试')
    return
  }
  if (!validateAnnouncementConfig())
    return

  const nextConfig = normalizeSiteConfig()
  const changes = getConfigChanges(nextConfig)
  if (changes.length === 0) {
    ElMessage.info('暂无配置变更')
    return
  }

  try {
    await ElMessageBox.confirm(
      buildChangeConfirmContent(changes),
      '确认保存配置',
      {
        confirmButtonText: '确认保存',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: true,
      },
    )
  }
  catch {
    ElMessage.info('已取消保存')
    return
  }

  try {
    saving.value = true
    jsonData.value = nextConfig
    await updateJsonData()
    syncForm(jsonData.value)
    ElMessage.success('全局配置已保存')
  }
  catch {
    ElMessage.error('保存失败，请稍后重试')
  }
  finally {
    saving.value = false
  }
}

watch(
  jsonData,
  value => syncForm(value),
  {
    immediate: true,
    deep: true,
  },
)

onMounted(() => {
  for (const r of routes.value) {
    SuperOverviewApi.checkDisabledRoute(r.path).then((v) => {
      showRoutes.push({
        path: r.path,
        name: String(r.name),
        title: String(r.meta?.title || r.name || r.path),
        disabled: !!v.data?.status,
      })
    })
  }
})
</script>

<template>
  <div class="config-page">
    <section class="hero-card">
      <div>
        <p class="eyebrow">
          系统配置
        </p>
        <h1>配置中心</h1>
        <p class="hero-desc">
          统一管理可禁用路由与全局站点参数，表单化编辑后会直接写入服务端配置。
        </p>
      </div>
      <div class="hero-stat">
        <strong>{{ enabledRouteCount }}</strong>
        <span>个路由启用中</span>
      </div>
    </section>

    <section class="panel">
      <div class="section-head">
        <div>
          <h2>禁用路由管理</h2>
          <p>关闭后对应页面将无法访问，注册页关闭时会同步禁用注册能力。</p>
        </div>
      </div>

      <div class="route-grid">
        <article
          v-for="route in showRoutes"
          :key="route.name"
          class="route-item"
          :class="{ disabled: route.disabled }"
        >
          <div class="route-main">
            <strong>{{ route.title }}</strong>
            <span>{{ route.path }}</span>
            <small v-if="route.path === '/register'">关闭后将同时禁用注册功能</small>
          </div>
          <el-switch
            :model-value="!route.disabled"
            inline-prompt
            active-text="开"
            inactive-text="关"
            style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff6b6b"
            @change="handleChangeRoute(route)"
          />
        </article>
      </div>
    </section>

    <section class="panel">
      <div class="section-head form-head">
        <div>
          <h2>全局配置管理</h2>
          <p>按场景维护站点参数，无需直接编辑 JSON。</p>
        </div>
        <div class="actions">
          <el-button @click="handleResetConfig">
            重置
          </el-button>
          <el-button type="primary" :loading="saving" @click="handleSaveConfig">
            保存配置
          </el-button>
        </div>
      </div>

      <el-form
        ref="siteFormRef"
        :model="siteForm"
        :rules="rules"
        label-position="top"
        class="config-form"
      >
        <el-tabs v-model="activeConfigTab" class="config-tabs">
          <el-tab-pane
            v-for="section in configSections"
            :key="section.title"
            :label="section.title"
            :name="section.title"
          >
            <div class="tab-desc">
              {{ section.description }}
            </div>

            <div class="field-list">
              <el-form-item
                v-for="field in section.fields"
                :key="field.key"
                :prop="field.key"
                class="field-item"
              >
                <template #label>
                  <span class="field-label">{{ field.label }}</span>
                  <span class="field-desc">{{ field.description }}</span>
                </template>

                <div class="field-control">
                  <el-switch
                    v-if="field.type === 'switch'"
                    :model-value="Boolean(getFieldValue(field.key))"
                    inline-prompt
                    active-text="开"
                    inactive-text="关"
                    @update:model-value="updateFieldValue(field.key, $event)"
                  />
                  <el-date-picker
                    v-else-if="field.type === 'date'"
                    :model-value="Number(getFieldValue(field.key))"
                    type="date"
                    value-format="x"
                    placeholder="请选择日期"
                    class="full-control"
                    @update:model-value="updateFieldValue(field.key, Number($event))"
                  />
                  <el-input-number
                    v-else-if="field.type === 'number'"
                    :model-value="Number(getFieldValue(field.key))"
                    :min="field.min"
                    :max="field.max"
                    :step="field.step || 1"
                    :precision="field.precision"
                    controls-position="right"
                    class="number-control"
                    @update:model-value="updateFieldValue(field.key, Number($event))"
                  />
                  <el-select
                    v-else-if="field.type === 'select'"
                    :model-value="String(getFieldValue(field.key))"
                    placeholder="请选择"
                    class="full-control"
                    @update:model-value="updateFieldValue(field.key, $event)"
                  >
                    <el-option
                      v-for="opt in field.options"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </el-select>
                  <el-input
                    v-else-if="field.type === 'textarea'"
                    :model-value="String(getFieldValue(field.key))"
                    type="textarea"
                    :rows="3"
                    :maxlength="field.maxlength || 300"
                    show-word-limit
                    placeholder="请输入"
                    @update:model-value="updateFieldValue(field.key, $event)"
                  />
                  <el-input
                    v-else
                    :model-value="String(getFieldValue(field.key))"
                    :type="field.type === 'url' ? 'url' : 'text'"
                    :maxlength="field.maxlength || 30"
                    show-word-limit
                    placeholder="请输入"
                    @update:model-value="updateFieldValue(field.key, $event)"
                  />
                  <span v-if="field.suffix" class="suffix">{{ field.suffix }}</span>
                </div>
              </el-form-item>
            </div>
          </el-tab-pane>

          <el-tab-pane label="通告配置" :name="ANNOUNCEMENT_TAB">
            <div class="tab-desc">
              配置展示给用户的顶部条和弹窗通告；每种类型只保留一条，关闭开关即可停用。
            </div>

            <div class="announcement-config">
              <section class="announcement-block">
                <div class="announcement-block-head">
                  <div>
                    <h3>页面顶部条状通告</h3>
                    <p>显示在页面最上方，适合短通知、维护提示或重要链接说明。</p>
                  </div>
                  <el-switch
                    v-model="siteForm.announcementTop.enabled"
                    inline-prompt
                    active-text="开"
                    inactive-text="关"
                  />
                </div>

                <div class="field-list">
                  <el-form-item class="field-item">
                    <template #label>
                      <span class="field-label">顶部条标题</span>
                      <span class="field-desc">可选，留空则只展示正文。</span>
                    </template>
                    <el-input v-model="siteForm.announcementTop.title" clearable placeholder="例如：系统维护" />
                  </el-form-item>

                  <el-form-item class="field-item">
                    <template #label>
                      <span class="field-label">顶部条内容</span>
                      <span class="field-desc">支持换行；开启 HTML 渲染后会按 HTML 展示。</span>
                    </template>
                    <el-input
                      v-model="siteForm.announcementTop.content"
                      type="textarea"
                      :rows="3"
                      maxlength="300"
                      show-word-limit
                      placeholder="请输入顶部条通告内容"
                    />
                  </el-form-item>

                  <el-form-item class="field-item">
                    <template #label>
                      <span class="field-label">顶部条 HTML 渲染</span>
                      <span class="field-desc">默认关闭；开启后会将顶部条内容作为 HTML 片段渲染。</span>
                    </template>
                    <el-switch
                      v-model="siteForm.announcementTop.renderHtml"
                      inline-prompt
                      active-text="开"
                      inactive-text="关"
                    />
                  </el-form-item>

                  <el-form-item class="field-item">
                    <template #label>
                      <span class="field-label">顶部条样式</span>
                      <span class="field-desc">选择不同语义色以匹配内容重要程度。</span>
                    </template>
                    <el-select v-model="siteForm.announcementTop.theme" class="full-control">
                      <el-option
                        v-for="item in announcementThemeOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      />
                    </el-select>
                  </el-form-item>

                  <el-form-item class="field-item">
                    <template #label>
                      <span class="field-label">允许用户关闭</span>
                      <span class="field-desc">开启后用户可在当前浏览器关闭此条通告；通告内容变化后会重新展示。</span>
                    </template>
                    <el-switch
                      v-model="siteForm.announcementTop.closable"
                      inline-prompt
                      active-text="开"
                      inactive-text="关"
                    />
                  </el-form-item>
                </div>

                <div class="announcement-preview" :class="`announcement-preview--${siteForm.announcementTop.theme}`">
                  <strong v-if="siteForm.announcementTop.title">{{ siteForm.announcementTop.title }}</strong>
                  <span
                    v-if="siteForm.announcementTop.renderHtml"
                    class="announcement-preview-html"
                    v-html="siteForm.announcementTop.content || '顶部条通告预览'"
                  />
                  <span v-else>{{ siteForm.announcementTop.content || '顶部条通告预览' }}</span>
                </div>
              </section>

              <section class="announcement-block">
                <div class="announcement-block-head">
                  <div>
                    <h3>弹窗通告</h3>
                    <p>进入页面后自动弹出，适合需要用户明确看到的重要通知。</p>
                  </div>
                  <el-switch
                    v-model="siteForm.announcementModal.enabled"
                    inline-prompt
                    active-text="开"
                    inactive-text="关"
                  />
                </div>

                <div class="field-list">
                  <el-form-item class="field-item">
                    <template #label>
                      <span class="field-label">弹窗标题</span>
                      <span class="field-desc">展示在弹窗顶部。</span>
                    </template>
                    <el-input v-model="siteForm.announcementModal.title" clearable placeholder="通告" />
                  </el-form-item>

                  <el-form-item class="field-item">
                    <template #label>
                      <span class="field-label">弹窗内容</span>
                      <span class="field-desc">支持换行；开启 HTML 渲染后会按 HTML 展示。</span>
                    </template>
                    <el-input
                      v-model="siteForm.announcementModal.content"
                      type="textarea"
                      :rows="4"
                      maxlength="600"
                      show-word-limit
                      placeholder="请输入弹窗通告内容"
                    />
                  </el-form-item>

                  <el-form-item class="field-item">
                    <template #label>
                      <span class="field-label">弹窗 HTML 渲染</span>
                      <span class="field-desc">默认关闭；开启后会将弹窗内容作为 HTML 片段渲染。</span>
                    </template>
                    <el-switch
                      v-model="siteForm.announcementModal.renderHtml"
                      inline-prompt
                      active-text="开"
                      inactive-text="关"
                    />
                  </el-form-item>

                  <el-form-item class="field-item">
                    <template #label>
                      <span class="field-label">弹窗样式</span>
                      <span class="field-desc">影响弹窗内容区域背景色。</span>
                    </template>
                    <el-select v-model="siteForm.announcementModal.theme" class="full-control">
                      <el-option
                        v-for="item in announcementThemeOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                      />
                    </el-select>
                  </el-form-item>

                  <el-form-item class="field-item">
                    <template #label>
                      <span class="field-label">弹窗展示次数</span>
                      <span class="field-desc">同一浏览器内，当前这条弹窗最多展示的次数；内容变化后重新计数。</span>
                    </template>
                    <el-input-number
                      v-model="siteForm.announcementModal.showTimes"
                      :min="1"
                      :step="1"
                      controls-position="right"
                      class="number-control"
                    />
                  </el-form-item>

                  <el-form-item class="field-item">
                    <template #label>
                      <span class="field-label">确认按钮文案</span>
                      <span class="field-desc">留空时默认显示“知道了”。</span>
                    </template>
                    <el-input v-model="siteForm.announcementModal.confirmText" clearable placeholder="知道了" />
                  </el-form-item>
                </div>
              </section>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-form>
    </section>
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
  max-width: 560px;
  margin: 0;
  color: #6b7280;
  line-height: 1.7;
}

.hero-stat {
  display: grid;
  place-items: center;
  min-width: 132px;
  min-height: 132px;
  border-radius: 28px;
  background: rgb(255 255 255 / 72%);
  box-shadow: inset 0 0 0 1px rgb(64 158 255 / 12%);

  strong {
    color: #2563eb;
    font-size: 42px;
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

.actions {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
}

.route-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}

.route-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e8edf5;
  border-radius: 14px;
  background: #fbfdff;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    transform 0.2s;

  &:hover {
    border-color: rgb(64 158 255 / 45%);
    box-shadow: 0 8px 24px rgb(64 158 255 / 10%);
    transform: translateY(-1px);
  }

  &.disabled {
    background: #fff8f8;
  }
}

.route-main {
  display: grid;
  gap: 5px;

  strong {
    font-size: 16px;
  }

  span,
  small {
    color: #6b7280;
    font-size: 13px;
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

.tab-desc {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f7faff;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.5;
}

.field-list {
  display: grid;
  gap: 12px;
}

.config-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.config-form :deep(.el-form-item__label) {
  display: block;
  margin-bottom: 4px;
  line-height: 1.4;
}

.field-item {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(220px, 320px);
  align-items: center;
  gap: 16px;
  padding: 12px 14px;
  border: 1px solid #edf0f5;
  border-radius: 12px;
  background: #fff;

  :deep(.el-form-item__label) {
    margin-bottom: 0;
    padding-right: 0;
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

.field-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.full-control,
.number-control {
  flex: 1;
  width: 100%;
  min-width: 0;
}

.suffix {
  flex-shrink: 0;
  color: #6b7280;
  font-size: 13px;
}

.announcement-config {
  display: grid;
  gap: 16px;
}

.announcement-block {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid #edf0f5;
  border-radius: 14px;
  background: #fbfdff;
}

.announcement-block-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  h3 {
    margin: 0 0 6px;
    color: #1f2937;
    font-size: 16px;
  }

  p {
    margin: 0;
    color: #8a94a6;
    font-size: 13px;
    line-height: 1.5;
  }
}

.announcement-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 14px;
  border: 1px solid transparent;
  border-radius: 10px;
  text-align: center;
  font-size: 14px;
  line-height: 1.6;

  strong {
    flex-shrink: 0;
  }

  span {
    white-space: pre-line;
    word-break: break-word;
  }
}

.announcement-preview-html {
  :deep(a) {
    color: inherit;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  :deep(p) {
    margin: 0 0 6px;
  }

  :deep(p:last-child) {
    margin-bottom: 0;
  }
}

.announcement-preview--info {
  border-color: #d9ecff;
  background: #ecf5ff;
  color: #1f5f99;
}

.announcement-preview--success {
  border-color: #e1f3d8;
  background: #f0f9eb;
  color: #2f7d32;
}

.announcement-preview--warning {
  border-color: #faecd8;
  background: #fdf6ec;
  color: #9a5b13;
}

.announcement-preview--danger {
  border-color: #fde2e2;
  background: #fef0f0;
  color: #a13030;
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

  .hero-stat {
    display: flex;
    justify-content: center;
    width: 100%;
    min-height: auto;
    padding: 18px;
    gap: 10px;
    border-radius: 18px;
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

  .form-head,
  .section-head {
    display: block;
  }

  .actions {
    margin-top: 14px;

    .el-button {
      flex: 1;
    }
  }

  .route-grid {
    grid-template-columns: 1fr;
  }

  .route-item {
    align-items: flex-start;
  }

  .config-tabs :deep(.el-tabs__nav-scroll) {
    overflow-x: auto;
  }

  .field-item {
    padding: 12px;
  }

  .announcement-block {
    padding: 12px;
  }

  .announcement-block-head,
  .announcement-preview {
    align-items: flex-start;
    flex-direction: column;
    text-align: left;
  }
}
</style>
