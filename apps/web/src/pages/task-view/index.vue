<script lang="ts" setup>
import type { TaskViewMeta, TaskViewProgress } from '@/apis/modules/taskView'
import HomeFooter from '@components/HomeFooter/index.vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { TaskViewApi } from '@/apis'
import { formatDate } from '@/utils/stringUtil'

const $route = useRoute()
const key = String($route.params.key || '')

const meta = ref<TaskViewMeta | null>(null)
const progress = ref<TaskViewProgress | null>(null)
const loading = ref(true)
const passwordPanel = reactive({
  visible: false,
  value: '',
  loading: false,
})
const errorTip = ref('')

const ddlText = computed(() => {
  const target = progress.value?.ddl || meta.value?.ddl
  if (!target)
    return ''
  return formatDate(new Date(target), 'yyyy-MM-dd hh:mm')
})

const submittedRatio = computed(() => {
  const p = progress.value
  if (!p || !p.totalPeople)
    return ''
  return `${p.submittedCount}/${p.totalPeople}`
})

let pollTimer: ReturnType<typeof setInterval> | null = null

async function loadProgress() {
  try {
    const res = await TaskViewApi.getProgress(key)
    progress.value = ((res as unknown as { data: TaskViewProgress }).data
      ?? (res as unknown as TaskViewProgress))
    errorTip.value = ''
  }
  catch (e: any) {
    const code = e?.code ?? e?.response?.data?.code
    if (code === 3004) {
      // 需要密码或未鉴权
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
      loadProgress()
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
    loadProgress()
  }
}

async function init() {
  loading.value = true
  try {
    const res = await TaskViewApi.getMeta(key)
    meta.value = ((res as unknown as { data: TaskViewMeta }).data
      ?? (res as unknown as TaskViewMeta))
    if (!meta.value || !meta.value.enabled) {
      loading.value = false
      return
    }
    if (meta.value.needPassword) {
      passwordPanel.visible = true
      loading.value = false
      return
    }
    await loadProgress()
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
    await loadProgress()
    startPolling()
  }
  catch (e: any) {
    ElMessage.error(e?.msg || '密码错误')
  }
  finally {
    passwordPanel.loading = false
  }
}

onMounted(() => {
  init()
  document.addEventListener('visibilitychange', handleVisibility)
})

onUnmounted(() => {
  stopPolling()
  document.removeEventListener('visibilitychange', handleVisibility)
})
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

      <div v-else-if="progress" class="tv-content">
        <section class="tv-task-info">
          <h2>{{ progress.name }}</h2>
          <div class="tv-meta-row">
            <span v-if="ddlText">⏰ 截止：{{ ddlText }}</span>
            <span v-if="submittedRatio">✅ 已提交：{{ submittedRatio }}</span>
            <span v-else>✅ 已提交：{{ progress.submittedCount }} 人</span>
          </div>
        </section>

        <section class="tv-section">
          <h3>已提交 ({{ progress.submitted.length }})</h3>
          <el-empty v-if="!progress.submitted.length" description="暂无提交" />
          <el-table v-else :data="progress.submitted" stripe>
            <el-table-column prop="people" :label="meta.bindField || '姓名'" min-width="120" />
            <el-table-column label="提交时间" min-width="160">
              <template #default="{ row }">
                {{ row.submitAt ? formatDate(new Date(row.submitAt), 'yyyy-MM-dd hh:mm') : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="文件数" min-width="80" prop="fileCount" />
            <el-table-column
              v-for="cfg in meta.visibleFields.filter(f => f.name !== (meta && meta.bindField))"
              :key="cfg.name"
              :label="cfg.name"
              min-width="120"
            >
              <template #default="{ row }">
                {{ (row.maskedFields.find(m => m.name === cfg.name) || {}).value || '-' }}
              </template>
            </el-table-column>
            <el-table-column v-if="progress.showFileNames" label="文件名" min-width="200">
              <template #default="{ row }">
                <div v-for="(f, idx) in row.fileNames || []" :key="idx" class="tv-filename">
                  {{ f }}
                </div>
              </template>
            </el-table-column>
          </el-table>
        </section>

        <section v-if="progress.limitPeople && progress.showUnsubmitted" class="tv-section">
          <h3>未提交 ({{ (progress.unsubmitted || []).length }})</h3>
          <el-empty v-if="!progress.unsubmitted || !progress.unsubmitted.length" description="全部已提交" />
          <div v-else class="tv-unsubmitted-list">
            <el-tag v-for="name in progress.unsubmitted" :key="name" type="info" effect="plain">
              {{ name }}
            </el-tag>
          </div>
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
  max-width: 960px;
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

.tv-section h3 {
  margin: 0 0 12px;
  font-size: 16px;
  color: #303133;
}

.tv-unsubmitted-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tv-filename {
  font-size: 12px;
  color: #606266;
  word-break: break-all;
}

.tv-error {
  color: #f56c6c;
  text-align: center;
  margin: 16px 0;
}
</style>
