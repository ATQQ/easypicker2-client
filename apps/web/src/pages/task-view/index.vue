<script lang="ts" setup>
import type {
  TaskViewMeta,
  TaskViewRosterProgress,
  TaskViewSubmittedProgress,
} from '@/apis/modules/taskView'
import HomeFooter from '@components/HomeFooter/index.vue'
import { useLocalStorage } from '@vueuse/core'
import { ElMessage } from 'element-plus'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { TaskViewApi } from '@/apis'
import { formatDate, formatSize } from '@/utils/stringUtil'

const $route = useRoute()
const key = String($route.params.key || '')

const meta = ref<TaskViewMeta | null>(null)
const loading = ref(true)
const errorTip = ref('')

// 本地仅缓存密码以便刷新后自动 verify 换 Cookie，不再把密码塞进 progress URL
const passwordCache = useLocalStorage<Record<string, string>>(
  'task_view_pwd_map',
  {},
)
function readCachedPassword() {
  if (!key)
    return ''
  return passwordCache.value?.[key] || ''
}
function saveCachedPassword(value: string) {
  if (!key)
    return
  passwordCache.value = { ...passwordCache.value, [key]: value }
}
function clearCachedPassword() {
  if (!key)
    return
  const next = { ...passwordCache.value }
  delete next[key]
  passwordCache.value = next
}

const passwordPanel = reactive({
  visible: false,
  value: '',
  loading: false,
  errorTip: '',
})

type TabName = 'submitted' | 'roster'
const activeTab = ref<TabName>('submitted')

const submittedProgress = ref<TaskViewSubmittedProgress | null>(null)
const rosterProgress = ref<TaskViewRosterProgress | null>(null)

const submittedPagination = reactive({
  pageIndex: 1,
  pageSize: 20,
})

const rosterPagination = reactive({
  pageIndex: 1,
  pageSize: 20,
})

const ddlText = computed(() => {
  if (!meta.value?.ddl)
    return ''
  return formatDate(new Date(meta.value.ddl), 'yyyy-MM-dd hh:mm')
})

const rosterEnabled = computed(() => !!meta.value?.roster?.enabled)
const bindFieldLabel = computed(() => meta.value?.bindField || '姓名')

const rosterColumns = computed(() => {
  const cols = rosterProgress.value?.columns ?? meta.value?.roster?.columns ?? ['status', 'submitDate']
  return {
    status: cols.includes('status'),
    submitDate: cols.includes('submitDate'),
  }
})

const showFileName = computed(() => meta.value?.fileFields?.fileName?.visible !== false)
const showOriginName = computed(() => meta.value?.fileFields?.originName?.visible === true)
const showFileSize = computed(() => meta.value?.fileFields?.size?.visible !== false)

const submittedInfoColumns = computed<string[]>(() => {
  const set = new Set<string>()
  for (const f of submittedProgress.value?.files || []) {
    for (const it of f.info || []) {
      if (it?.text)
        set.add(it.text)
    }
  }
  return Array.from(set)
})

function getInfoValue(row: any, name: string): string {
  const hit = (row?.info || []).find((it: any) => it?.text === name)
  return hit?.value ?? ''
}

let pollTimer: ReturnType<typeof setInterval> | null = null
let reVerifyInFlight = false

function unwrap<T>(res: unknown): T {
  return ((res as any)?.data ?? res) as T
}

async function ensureViewSession(password: string) {
  await TaskViewApi.verify(key, password)
  saveCachedPassword(password)
}

async function loadCurrentTab() {
  try {
    if (activeTab.value === 'submitted') {
      const res = await TaskViewApi.getProgress(key, {
        tab: 'submitted',
        pageIndex: submittedPagination.pageIndex,
        pageSize: submittedPagination.pageSize,
      })
      submittedProgress.value = unwrap<TaskViewSubmittedProgress>(res)
    }
    else {
      const res = await TaskViewApi.getProgress(key, {
        tab: 'roster',
        pageIndex: rosterPagination.pageIndex,
        pageSize: rosterPagination.pageSize,
      })
      rosterProgress.value = unwrap<TaskViewRosterProgress>(res)
    }
    errorTip.value = ''
  }
  catch (e: any) {
    const code = e?.code ?? e?.response?.data?.code
    if (code === 3004) {
      const cached = readCachedPassword()
      if (cached && !reVerifyInFlight) {
        reVerifyInFlight = true
        try {
          await ensureViewSession(cached)
          await loadCurrentTab()
          return
        }
        catch {
          // fall through to password panel
        }
        finally {
          reVerifyInFlight = false
        }
      }
      passwordPanel.errorTip = cached ? '访问密码已变更，请重新输入' : '请输入访问密码'
      if (cached)
        ElMessage.error('访问密码已变更，请重新输入')
      clearCachedPassword()
      passwordPanel.visible = true
      stopPolling()
    }
    else {
      errorTip.value = e?.msg || e?.message || '加载失败'
    }
  }
}

function pollIntervalMs() {
  // 名单查询相对更重，降低刷新频率
  return activeTab.value === 'roster' ? 30 * 1000 : 10 * 1000
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    if (document.visibilityState === 'visible') {
      loadCurrentTab()
    }
  }, pollIntervalMs())
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function handleVisibility() {
  if (document.visibilityState === 'visible' && meta.value?.enabled && !passwordPanel.visible) {
    loadCurrentTab()
  }
}

function handleTabChange(name: string | number) {
  activeTab.value = (name as TabName) || 'submitted'
  loadCurrentTab()
  if (!passwordPanel.visible)
    startPolling()
}

async function init() {
  loading.value = true
  try {
    const res = await TaskViewApi.getMeta(key)
    meta.value = unwrap<TaskViewMeta>(res)
    if (!meta.value || !meta.value.enabled) {
      loading.value = false
      return
    }
    if (meta.value.needPassword) {
      const cached = readCachedPassword()
      if (cached) {
        try {
          await ensureViewSession(cached)
          activeTab.value = 'submitted'
          await loadCurrentTab()
          if (!passwordPanel.visible)
            startPolling()
        }
        catch {
          clearCachedPassword()
          passwordPanel.visible = true
        }
      }
      else {
        passwordPanel.visible = true
      }
      loading.value = false
      return
    }
    activeTab.value = 'submitted'
    await loadCurrentTab()
    startPolling()
  }
  catch (e: any) {
    errorTip.value = e?.msg || e?.message || '加载失败'
  }
  finally {
    loading.value = false
  }
}

async function verify() {
  if (!passwordPanel.value) {
    ElMessage.warning('请输入访问密码')
    return
  }
  passwordPanel.loading = true
  try {
    await ensureViewSession(passwordPanel.value)
    passwordPanel.visible = false
    passwordPanel.value = ''
    passwordPanel.errorTip = ''
    await loadCurrentTab()
    if (!passwordPanel.visible)
      startPolling()
  }
  catch (e: any) {
    ElMessage.error(e?.msg || '密码错误')
  }
  finally {
    passwordPanel.loading = false
  }
}

watch(
  () => submittedPagination.pageIndex,
  () => {
    if (activeTab.value === 'submitted')
      loadCurrentTab()
  },
)
watch(
  () => submittedPagination.pageSize,
  () => {
    submittedPagination.pageIndex = 1
    if (activeTab.value === 'submitted')
      loadCurrentTab()
  },
)
watch(
  () => rosterPagination.pageIndex,
  () => {
    if (activeTab.value === 'roster')
      loadCurrentTab()
  },
)
watch(
  () => rosterPagination.pageSize,
  () => {
    rosterPagination.pageIndex = 1
    if (activeTab.value === 'roster')
      loadCurrentTab()
  },
)

onMounted(() => {
  init()
  document.addEventListener('visibilitychange', handleVisibility)
})

onUnmounted(() => {
  stopPolling()
  document.removeEventListener('visibilitychange', handleVisibility)
})

function isSubmitted(status: unknown): boolean {
  return !!Number(status)
}
</script>

<template>
  <div class="task-view-page">
    <header class="tv-header">
      <h1>📊 收集情况</h1>
    </header>

    <main class="tv-main">
      <div v-if="loading" class="tv-state">
        加载中…
      </div>

      <div v-else-if="!meta || !meta.enabled" class="tv-state tv-state-empty">
        <p>该任务未开启分享查看页</p>
        <p class="tv-state-sub">
          请联系任务发布者
        </p>
      </div>

      <div v-else-if="passwordPanel.visible" class="tv-password-panel">
        <h2>{{ meta.name }}</h2>
        <p>该查看页需要访问密码</p>
        <el-input
          v-model="passwordPanel.value"
          type="password"
          placeholder="请输入访问密码"
          show-password
          maxlength="64"
          @keyup.enter="verify"
        />
        <p v-if="passwordPanel.errorTip" class="tv-password-tip">
          {{ passwordPanel.errorTip }}
        </p>
        <el-button
          type="primary"
          :loading="passwordPanel.loading"
          class="tv-password-btn"
          @click="verify"
        >
          进入查看
        </el-button>
      </div>

      <div v-else class="tv-content">
        <section class="tv-task-info">
          <h2>{{ meta.name }}</h2>
          <div v-if="ddlText" class="tv-meta-row">
            <span>⏰ 截止：{{ ddlText }}</span>
          </div>
        </section>

        <el-tabs v-if="rosterEnabled" v-model="activeTab" @tab-change="handleTabChange">
          <el-tab-pane label="文件提交记录" name="submitted" />
          <el-tab-pane label="人员提交记录" name="roster" />
        </el-tabs>

        <section v-show="activeTab === 'submitted'" class="tv-section">
          <el-empty v-if="!submittedProgress || !submittedProgress.files.length" description="暂无提交" />
          <template v-else>
            <el-table :data="submittedProgress.files" stripe>
              <el-table-column label="提交时间" prop="date" min-width="170">
                <template #default="{ row }">
                  {{ row.date ? formatDate(new Date(row.date), 'yyyy-MM-dd hh:mm') : '-' }}
                </template>
              </el-table-column>
              <el-table-column label="任务" prop="task_name" min-width="140" />
              <el-table-column v-if="showFileName" label="文件名" prop="name" min-width="220">
                <template #default="{ row }">
                  <span class="tv-filename">{{ row.name || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column v-if="showOriginName" label="原文件名" prop="origin_name" min-width="220">
                <template #default="{ row }">
                  <span class="tv-filename">{{ row.origin_name || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column v-if="showFileSize" label="大小" prop="size" min-width="100">
                <template #default="{ row }">
                  {{ row.size ? formatSize(row.size) : '未知大小' }}
                </template>
              </el-table-column>
              <el-table-column
                v-for="name in submittedInfoColumns"
                :key="name"
                :label="name"
                min-width="120"
              >
                <template #default="{ row }">
                  {{ getInfoValue(row, name) || '-' }}
                </template>
              </el-table-column>
            </el-table>
            <div class="tv-pagination">
              <el-pagination
                v-model:current-page="submittedPagination.pageIndex"
                v-model:page-size="submittedPagination.pageSize"
                :total="submittedProgress.total"
                :page-sizes="[10, 20, 50, 100]"
                layout="total, sizes, prev, pager, next, jumper"
                background
                small
              />
            </div>
          </template>
        </section>

        <section v-show="rosterEnabled && activeTab === 'roster'" class="tv-section">
          <el-empty v-if="!rosterProgress || !rosterProgress.people.length" description="暂无名单数据" />
          <template v-else>
            <el-table :data="rosterProgress.people" stripe>
              <el-table-column type="index" label="序号" width="70" />
              <el-table-column :label="bindFieldLabel" prop="name" min-width="120" />
              <el-table-column v-if="rosterColumns.status" label="提交状态" min-width="100">
                <template #default="{ row }">
                  <el-tag :type="isSubmitted(row.status) ? 'success' : 'info'" size="small">
                    {{ isSubmitted(row.status) ? '已提交' : '未提交' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column v-if="rosterColumns.submitDate" label="提交次数" prop="count" min-width="100" />
              <el-table-column v-if="rosterColumns.submitDate" label="最后操作时间" prop="lastDate" min-width="170">
                <template #default="{ row }">
                  {{ row.lastDate ? formatDate(new Date(row.lastDate), 'yyyy-MM-dd hh:mm:ss') : '暂无记录' }}
                </template>
              </el-table-column>
            </el-table>
            <div class="tv-pagination">
              <el-pagination
                v-model:current-page="rosterPagination.pageIndex"
                v-model:page-size="rosterPagination.pageSize"
                :total="rosterProgress.total"
                :page-sizes="[10, 20, 50, 100]"
                layout="total, sizes, prev, pager, next, jumper"
                background
                small
              />
            </div>
          </template>
        </section>

        <p v-if="errorTip" class="tv-error">
          {{ errorTip }}
        </p>
      </div>
    </main>

    <HomeFooter type="task" />
  </div>
</template>

<style scoped>
.task-view-page {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.tv-header {
  padding: 24px 16px 8px;
  text-align: center;
}

.tv-header h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}

.tv-main {
  flex: 1;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 16px;
  box-sizing: border-box;
}

.tv-state {
  padding: 80px 16px;
  text-align: center;
  color: #909399;
}

.tv-state-empty .tv-state-sub {
  margin-top: 8px;
  font-size: 13px;
}

.tv-password-panel {
  background: #fff;
  padding: 32px 24px;
  border-radius: 8px;
  max-width: 360px;
  margin: 40px auto;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  text-align: center;
}

.tv-password-panel h2 {
  margin: 0 0 8px;
}

.tv-password-panel p {
  color: #909399;
  margin-bottom: 16px;
}

.tv-password-btn {
  width: 100%;
  margin-top: 12px;
}

.tv-password-tip {
  color: #f56c6c;
  font-size: 12px;
  margin: 8px 0 0;
  text-align: left;
}

.tv-task-info {
  background: #fff;
  padding: 20px 24px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.tv-task-info h2 {
  margin: 0 0 8px;
  font-size: 18px;
}

.tv-meta-row {
  display: flex;
  gap: 16px;
  color: #606266;
  font-size: 14px;
  flex-wrap: wrap;
}

.tv-section {
  background: #fff;
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.tv-filename {
  font-size: 13px;
  color: #606266;
  word-break: break-all;
}

.tv-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.tv-error {
  color: #f56c6c;
  text-align: center;
  margin: 16px 0;
}
</style>
