<script lang="ts" setup>
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ConfigServiceAPI } from '@/apis'
import Tip from '../tasks/components/infoPanel/tip.vue'

type ConfigData = ConfigServiceAPITypes.ConfigData
type ServiceConfigItem = ConfigServiceAPITypes.ServiceConfigItem
type ServiceOverviewItem = ConfigServiceAPITypes.ServiceOverviewItem
type MysqlSchemaOverview = ConfigServiceAPITypes.MysqlSchemaOverview
type MysqlLiveIntrospection = ConfigServiceAPITypes.MysqlLiveIntrospection
type MysqlLiveTable = ConfigServiceAPITypes.MysqlLiveTable

/** 与业务配置 Tab 并列，仅在有 MySQL 配置项时展示 */
const MYSQL_INTROSPECT_TAB = 'mysql-introspect'

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
const showMysqlIntrospectTab = computed(() => serverConfig.value.some(item => item.type === 'mysql'))
const mysqlLive = ref<MysqlLiveIntrospection | null>(null)
const mysqlLiveLoading = ref(false)
const mysqlLiveOpenNames = ref<string[]>([])

const currentConfig = computed(() => serverConfig.value.find(item => item.type === activeConfigTab.value))

function isActiveConfigTabValid(name: string) {
  if (serverConfig.value.some(item => item.type === name))
    return true
  return name === MYSQL_INTROSPECT_TAB && showMysqlIntrospectTab.value
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
    if (data?.tables?.length && !mysqlLiveOpenNames.value.length)
      mysqlLiveOpenNames.value = [data.tables[0].name]
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
    await navigator.clipboard.writeText(tbl.createSql)
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
      activeConfigTab.value = serverConfig.value[0]?.type || ''
    }
  }
  catch {
    ElMessage.error('服务配置加载失败')
  }
  finally {
    configLoading.value = false
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
    if (!check.databaseExists) {
      const autoItem = group.data.find(i => i.key === 'autoCreateDatabase')
      const autoOn = Boolean(autoItem?.value)
      if (!autoOn) {
        const dbName = group.data.find(i => i.key === 'database')?.value
        const name = dbName != null ? String(dbName).trim() : ''
        const msg = name
          ? `服务器上不存在名为「${name}」的数据库。是否开启「无库时自动建库并按模板导入全部表结构」并保存？`
          : `服务器上不存在该数据库。是否开启「无库时自动建库并按模板导入全部表结构」并保存？`
        try {
          await ElMessageBox.confirm(
            msg,
            '数据库不存在',
            {
              type: 'warning',
              confirmButtonText: '开启并保存',
              cancelButtonText: '取消',
            },
          )
        }
        catch {
          return
        }
        if (autoItem) {
          autoItem.value = true
        }
        else {
          group.data.push({
            type: 'mysql',
            key: 'autoCreateDatabase',
            value: true,
            label: '无库时自动建库并按模板导入全部表结构',
            isSecret: false,
          })
        }
      }
    }
  }

  savingMap[group.type] = true
  try {
    await ConfigServiceAPI.updateCfg(group.data)
    ElMessage.success(`${group.title} 配置已保存`)
    await getServiceConfig()
    await refreshStatus(false)
    if (group.type === 'mysql')
      await loadMysqlSchema()
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
  loadMysqlSchema()
})

watch(activeConfigTab, (t) => {
  if (t === 'mysql')
    loadMysqlSchema()
  if (t === MYSQL_INTROSPECT_TAB)
    loadMysqlLiveIntrospect()
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
              href="https://docs.ep.sugarat.top/deploy/online-new.html#_5-%E6%9C%80%E5%90%8E%E6%9B%B4%E6%96%B0%E9%85%8D%E7%BD%AE"
            >
              <el-button type="primary" link>配置手册?</el-button></a>
          </Tip>
        </div>
      </div>

      <div v-loading="schemaLoading" class="mysql-schema-hints">
        <template v-if="mysqlSchema">
          <div v-if="!mysqlSchema.error" style="margin-bottom: 12px">
            <el-button size="small" :loading="mysqlExportLoading" @click="openMysqlExportDialog">
              预览建表 SQL（全屏）
            </el-button>
            <span style="margin-left: 12px; color: var(--el-text-color-secondary); font-size: 13px;">
              弹窗内可浏览、框选复制片段，或使用「复制全部」。
            </span>
          </div>
          <el-alert
            v-if="mysqlSchema.error"
            :closable="false"
            show-icon
            type="error"
            title="MySQL schema 检测失败"
            style="margin-bottom: 12px"
          >
            <p>{{ mysqlSchema.error }}</p>
          </el-alert>
          <el-alert
            v-else-if="mysqlSchema.pending"
            type="warning"
            :closable="false"
            show-icon
            style="margin-bottom: 12px"
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
            style="margin-bottom: 12px"
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

      <el-empty v-if="!configLoading && !serverConfig.length" description="暂无可编辑的服务配置" />
      <div v-else v-loading="configLoading">
        <el-tabs v-model="activeConfigTab" class="config-tabs">
          <el-tab-pane
            v-for="serverItem in serverConfig"
            :key="serverItem.type"
            :label="serverItem.title"
            :name="serverItem.type"
          >
            <div class="tab-head">
              <div>
                <h3>{{ serverItem.title }}</h3>
                <p>{{ serverItem.description }}</p>
              </div>
              <el-button
                type="primary"
                :loading="savingMap[serverItem.type]"
                @click="updateCfgGroup(serverItem)"
              >
                保存 {{ serverItem.title }}
              </el-button>
            </div>

            <el-form label-position="top" class="config-form">
              <div class="field-list">
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
              </div>
            </el-form>
          </el-tab-pane>

          <el-tab-pane
            v-if="showMysqlIntrospectTab"
            label="MySQL 在线库表"
            :name="MYSQL_INTROSPECT_TAB"
          >
            <div class="tab-head">
              <div>
                <h3>MySQL 在线库表</h3>
                <p>
                  读取当前连接库的真实结构；行数与数据量来自 information_schema（InnoDB 行数为估算）。
                  可与上方「schema 对齐」提示及 <code>mysql-schema.json</code> 对照，确认字段与索引是否已生效。
                </p>
              </div>
              <el-button :loading="mysqlLiveLoading" :icon="Refresh" @click="loadMysqlLiveIntrospect">
                刷新
              </el-button>
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
          </el-tab-pane>
        </el-tabs>

        <div v-if="currentConfig" class="bottom-actions-row">
          <p class="bottom-actions-hint">
            与当前 Tab 右上角「保存 {{ currentConfig.title }}」是同一功能；表单项较多时滚到此处保存即可。
          </p>
          <el-button
            type="primary"
            :loading="savingMap[currentConfig.type]"
            @click="updateCfgGroup(currentConfig)"
          >
            保存当前服务配置
          </el-button>
        </div>
      </div>
    </section>

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

.field-list {
  display: grid;
  gap: 12px;
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

  .hero-stats {
    grid-template-columns: 1fr;
  }

  .config-tabs :deep(.el-tabs__nav-scroll) {
    overflow-x: auto;
  }

  .field-item {
    padding: 12px;
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
