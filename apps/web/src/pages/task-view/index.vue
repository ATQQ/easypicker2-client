<script lang="ts" setup>
import type {
  TaskViewMeta,
  TaskViewRosterProgress,
  TaskViewSubmittedProgress,
} from '@/apis/modules/taskView'
import HomeFooter from '@components/HomeFooter/index.vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { TaskViewApi } from '@/apis'
import { formatDate } from '@/utils/stringUtil'

const $route = useRoute()
const key = String($route.params.key || '')

const meta = ref<TaskViewMeta | null>(null)
const loading = ref(true)
const errorTip = ref('')

const passwordPanel = reactive({
  visible: false,
  value: '',
  loading: false,
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
const showUnsubmitted = computed(() => !!meta.value?.roster?.showUnsubmitted)
const rosterColumns = computed(() => meta.value?.roster?.columns || [])

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
      passwordPanel.visible = true
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
    passwordPanel.visible = false
    passwordPanel.value = ''
    await loadCurrentTab()
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

// 按 status 分区的名单数据
const rosterSubmittedItems = computed(
  () => rosterProgress.value?.items.filter(i => i.status) || [],
)
const rosterUnsubmittedItems = computed(
  () => rosterProgress.value?.items.filter(i => !i.status) || [],
)
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
          <el-tab-pane label="名单" name="roster" />
        </el-tabs>

        <section v-show="activeTab === 'submitted'" class="tv-section">
          <el-empty v-if="!submittedProgress || !submittedProgress.items.length" description="暂无提交" />
          <template v-else>
            <el-table :data="submittedProgress.items" stripe>
              <el-table-column
                prop="people"
                :label="submittedProgress.bindField || '姓名'"
                min-width="120"
              />
              <el-table-column label="提交时间" min-width="170">
                <template #default="{ row }">
                  {{ row.submitDate ? formatDate(new Date(row.submitDate), 'yyyy-MM-dd hh:mm') : '-' }}
                </template>
              </el-table-column>
              <el-table-column label="文件名" min-width="220">
                <template #default="{ row }">
                  <span class="tv-filename">{{ row.fileName }}</span>
                </template>
              </el-table-column>
              <el-table-column
                v-for="name in submittedProgress.visibleFieldNames"
                :key="name"
                :label="name"
                min-width="120"
              >
                <template #default="{ row }">
                  {{ row.fields[name] || '-' }}
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
          <el-empty v-if="!rosterProgress || !rosterProgress.items.length" description="暂无名单数据" />
          <template v-else>
            <template v-if="showUnsubmitted">
              <h4 class="tv-subtitle">
                已提交 ({{ rosterSubmittedItems.length }})
              </h4>
              <el-table v-if="rosterSubmittedItems.length" :data="rosterSubmittedItems" stripe>
                <el-table-column prop="name" :label="meta.bindField || '姓名'" min-width="120" />
                <el-table-column
                  v-if="rosterColumns.includes('status')"
                  label="状态"
                  min-width="100"
                >
                  <template #default>
                    <el-tag type="success" size="small">
                      已提交
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column
                  v-if="rosterColumns.includes('submitDate')"
                  label="提交时间"
                  min-width="170"
                >
                  <template #default="{ row }">
                    {{ row.submitDate ? formatDate(new Date(row.submitDate), 'yyyy-MM-dd hh:mm') : '-' }}
                  </template>
                </el-table-column>
              </el-table>
              <h4 class="tv-subtitle tv-subtitle--gap">
                未提交 ({{ rosterUnsubmittedItems.length }})
              </h4>
              <el-table v-if="rosterUnsubmittedItems.length" :data="rosterUnsubmittedItems" stripe>
                <el-table-column prop="name" :label="meta.bindField || '姓名'" min-width="120" />
                <el-table-column
                  v-if="rosterColumns.includes('status')"
                  label="状态"
                  min-width="100"
                >
                  <template #default>
                    <el-tag type="info" size="small">
                      未提交
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </template>
            <el-table v-else :data="rosterProgress.items" stripe>
              <el-table-column prop="name" :label="meta.bindField || '姓名'" min-width="120" />
              <el-table-column
                v-if="rosterColumns.includes('status')"
                label="状态"
                min-width="100"
              >
                <template #default="{ row }">
                  <el-tag :type="row.status ? 'success' : 'info'" size="small">
                    {{ row.status ? '已提交' : '未提交' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column
                v-if="rosterColumns.includes('submitDate')"
                label="提交时间"
                min-width="170"
              >
                <template #default="{ row }">
                  {{ row.submitDate ? formatDate(new Date(row.submitDate), 'yyyy-MM-dd hh:mm') : '-' }}
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

.tv-subtitle {
  margin: 0 0 8px;
  font-size: 14px;
  color: #303133;
  font-weight: 600;
}

.tv-subtitle--gap {
  margin-top: 18px;
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
