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

// 访问密码：参考任务提交密码的做法，按 key 在 localStorage 分桶存储，
// 刷新后自动透传，不再依赖服务端 Cookie。
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

const accessPassword = ref('')

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

const ddlText = computed(() => {
  if (!meta.value?.ddl)
    return ''
  return formatDate(new Date(meta.value.ddl), 'yyyy-MM-dd hh:mm')
})

const rosterEnabled = computed(() => !!meta.value?.roster?.enabled)
const bindFieldLabel = computed(() => meta.value?.bindField || '姓名')

// 文件原生字段可见性（由 meta.fileFields 控制，未配置时默认全展示）
const showFileName = computed(() => meta.value?.fileFields?.fileName?.visible !== false)
const showOriginName = computed(() => meta.value?.fileFields?.originName?.visible !== false)
const showFileSize = computed(() => meta.value?.fileFields?.size?.visible !== false)

// 从当前页 files 中归并出实际存在的 info 字段名作为动态列（后端已按用户配置过滤过）
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

function unwrap<T>(res: unknown): T {
  return ((res as any)?.data ?? res) as T
}

async function loadCurrentTab() {
  try {
    if (activeTab.value === 'submitted') {
      const res = await TaskViewApi.getProgress(key, {
        tab: 'submitted',
        pageIndex: submittedPagination.pageIndex,
        pageSize: submittedPagination.pageSize,
        password: accessPassword.value || undefined,
      })
      submittedProgress.value = unwrap<TaskViewSubmittedProgress>(res)
    }
    else {
      const res = await TaskViewApi.getProgress(key, {
        tab: 'roster',
        // 人员提交记录与 /people/:key 一致：一次性返回全量，无分页
        pageIndex: 1,
        pageSize: 1,
        password: accessPassword.value || undefined,
      })
      rosterProgress.value = unwrap<TaskViewRosterProgress>(res)
    }
    errorTip.value = ''
  }
  catch (e: any) {
    const code = e?.code ?? e?.response?.data?.code
    if (code === 3004) {
      // 缓存密码失效（被改 / 被清）→ 清缓存并打开密码门
      if (accessPassword.value) {
        passwordPanel.errorTip = '访问密码已变更，请重新输入'
        ElMessage.error('访问密码已变更，请重新输入')
      }
      accessPassword.value = ''
      clearCachedPassword()
      passwordPanel.visible = true
      stopPolling()
    }
    else {
      errorTip.value = e?.msg || e?.message || '加载失败'
    }
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    if (document.visibilityState === 'visible') {
      loadCurrentTab()
    }
  }, 10 * 1000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function handleVisibility() {
  if (document.visibilityState === 'visible' && meta.value?.enabled) {
    loadCurrentTab()
  }
}

function handleTabChange(name: string | number) {
  activeTab.value = (name as TabName) || 'submitted'
  loadCurrentTab()
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
      // 优先尝试用本地缓存的密码自动登录
      const cached = readCachedPassword()
      if (cached) {
        accessPassword.value = cached
        activeTab.value = 'submitted'
        await loadCurrentTab()
        // 若 loadCurrentTab 因 3004 已开了密码门，则不开轮询
        if (!passwordPanel.visible)
          startPolling()
      }
      else {
        passwordPanel.visible = true
      }
      loading.value = false
      return
    }
    // 默认 Tab：限制名单且启用名单 Tab 时仍以「文件提交记录」为默认（更直观）
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
    await TaskViewApi.verify(key, passwordPanel.value)
    // 校验通过：本地缓存 + 后续请求透传
    accessPassword.value = passwordPanel.value
    saveCachedPassword(passwordPanel.value)
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

onMounted(() => {
  init()
  document.addEventListener('visibilitychange', handleVisibility)
})

onUnmounted(() => {
  stopPolling()
  document.removeEventListener('visibilitychange', handleVisibility)
})

// 人员提交记录：与 people.vue 一致的状态判断（status 可能是 0/1 或 boolean）
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
          <el-table v-else :data="rosterProgress.people" stripe>
            <el-table-column type="index" label="序号" width="70" />
            <el-table-column :label="bindFieldLabel" prop="name" min-width="120" />
            <el-table-column label="提交状态" min-width="100">
              <template #default="{ row }">
                <el-tag :type="isSubmitted(row.status) ? 'success' : 'info'" size="small">
                  {{ isSubmitted(row.status) ? '已提交' : '未提交' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="提交次数" prop="count" min-width="100" />
            <el-table-column label="最后操作时间" prop="lastDate" min-width="170">
              <template #default="{ row }">
                {{ row.lastDate ? formatDate(new Date(row.lastDate), 'yyyy-MM-dd hh:mm:ss') : '暂无记录' }}
              </template>
            </el-table-column>
          </el-table>
        </section>

        <p v-if="errorTip" class="tv-error">
          {{ errorTip }}
        </p>
      </div>
    </main>

    <HomeFooter />
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
