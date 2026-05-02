<script lang="ts" setup>
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { ConfigServiceAPI } from '@/apis'
import Tip from '../tasks/components/infoPanel/tip.vue'

type ConfigData = ConfigServiceAPITypes.ConfigData
type ServiceConfigItem = ConfigServiceAPITypes.ServiceConfigItem
type ServiceOverviewItem = ConfigServiceAPITypes.ServiceOverviewItem

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
const currentConfig = computed(() => serverConfig.value.find(item => item.type === activeConfigTab.value))

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
  return typeof item.value === 'boolean' || item.key === 'auth'
}

function isNumberConfig(item: ServiceConfigItem) {
  return typeof item.value === 'number' || item.key === 'port'
}

function updateConfigValue(item: ServiceConfigItem, value: string | number | boolean) {
  item.value = value
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
    if (!activeConfigTab.value || !serverConfig.value.some(item => item.type === activeConfigTab.value)) {
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

async function updateCfgGroup(group?: ConfigData) {
  if (!group || savingMap[group.type])
    return
  savingMap[group.type] = true
  try {
    await ConfigServiceAPI.updateCfg(group.data)
    ElMessage.success(`${group.title} 配置已保存`)
    await getServiceConfig()
    await refreshStatus(false)
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
        </el-tabs>

        <div v-if="currentConfig" class="bottom-actions">
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

.bottom-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
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
}
</style>
