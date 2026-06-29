<script lang="ts" setup>
import type { MaskMode, ViewVisibleField } from '@/apis/modules/taskView'
import { ElMessage } from 'element-plus'
import { computed, ref, watch } from 'vue'
import { TaskViewApi } from '@/apis'
import { parseInfo } from '@/utils/stringUtil'
import { updateTaskInfo } from '../../public'

const props = defineProps({
  k: {
    type: String,
    default: '',
  },
  info: {
    type: [String, Array] as unknown as () => string | InfoItem[],
    default: '',
  },
})

const MASK_OPTIONS: { label: string, value: MaskMode }[] = [
  { label: '不脱敏', value: 'none' },
  { label: '只显示首位', value: 'head1' },
  { label: '只显示末四位', value: 'tail4' },
  { label: '全部 ****', value: 'mask_all' },
]

const loading = ref(false)
const saving = ref(false)
const enabled = ref(false)
const needPassword = ref(false)
const password = ref('')
const showUnsubmitted = ref(true)
const showFileNames = ref(false)
const visibleFields = ref<ViewVisibleField[]>([])

const availableFields = computed<string[]>(() => {
  const items = parseInfo(props.info) as InfoItem[]
  return items.map(v => v.text || '').filter(v => !!v)
})

function syncVisibleFields(serverFields: ViewVisibleField[]) {
  const fromServer = new Map<string, MaskMode>()
  for (const f of serverFields) {
    if (f && f.name) {
      fromServer.set(f.name, f.mask || 'none')
    }
  }
  visibleFields.value = availableFields.value.map(name => ({
    name,
    mask: fromServer.get(name) ?? 'none',
  }))
}

const checkedFieldNames = ref<string[]>([])

function parseStoredVisible(raw: string | null | undefined): ViewVisibleField[] {
  if (!raw)
    return []
  try {
    const data = JSON.parse(raw)
    const list = Array.isArray(data?.fields) ? data.fields : []
    return list
      .filter((v: any) => v && typeof v.name === 'string')
      .map((v: any) => ({ name: v.name, mask: (v.mask || 'none') as MaskMode }))
  }
  catch {
    return []
  }
}

async function load() {
  if (!props.k)
    return
  loading.value = true
  try {
    const data = await TaskViewApi.getViewConfig(props.k)
    const cfg = data as unknown as {
      viewEnabled: boolean
      viewPassword: string
      viewVisibleFields: string
      viewShowUnsubmitted: boolean
      viewShowFileNames: boolean
    }
    enabled.value = !!cfg.viewEnabled
    password.value = cfg.viewPassword || ''
    needPassword.value = !!cfg.viewPassword
    showUnsubmitted.value = cfg.viewShowUnsubmitted !== false
    showFileNames.value = !!cfg.viewShowFileNames
    const stored = parseStoredVisible(cfg.viewVisibleFields)
    syncVisibleFields(stored)
    checkedFieldNames.value = stored.map(v => v.name).filter(name =>
      availableFields.value.includes(name),
    )
  }
  catch {
    ElMessage.error('查看页配置加载失败')
  }
  finally {
    loading.value = false
  }
}

watch(() => props.k, load, { immediate: true })
watch(
  () => props.info,
  () => {
    if (!visibleFields.value.length) {
      syncVisibleFields([])
      return
    }
    const existing = new Map(visibleFields.value.map(v => [v.name, v.mask]))
    visibleFields.value = availableFields.value.map(name => ({
      name,
      mask: existing.get(name) ?? 'none',
    }))
    checkedFieldNames.value = checkedFieldNames.value.filter(n =>
      availableFields.value.includes(n),
    )
  },
)

function buildPayload(): TaskApiTypes.TaskInfo {
  const selected = visibleFields.value.filter(v =>
    checkedFieldNames.value.includes(v.name),
  )
  const payload: TaskApiTypes.TaskInfo = {
    viewEnabled: enabled.value,
    viewShowUnsubmitted: showUnsubmitted.value,
    viewShowFileNames: showFileNames.value,
    viewVisibleFields: JSON.stringify({ fields: selected }),
  }
  if (needPassword.value) {
    const value = (password.value || '').trim()
    if (value.length < 4 || value.length > 64) {
      throw new Error('查看密码需为 4-64 位')
    }
    payload.viewPassword = value
  }
  else {
    payload.viewPassword = ''
  }
  return payload
}

async function handleSave() {
  if (!props.k)
    return
  let payload: TaskApiTypes.TaskInfo
  try {
    payload = buildPayload()
  }
  catch (e: any) {
    ElMessage.warning(e?.message || '配置不合法')
    return
  }
  saving.value = true
  try {
    updateTaskInfo(props.k, payload)
  }
  finally {
    saving.value = false
  }
}

function handleCopyLink() {
  const url = `${location.origin}/task-view/${props.k}`
  navigator.clipboard
    .writeText(url)
    .then(() => ElMessage.success('已复制查看页链接'))
    .catch(() => ElMessage.error('复制失败，请手动复制'))
}

function openPreview() {
  window.open(`/task-view/${props.k}`)
}
</script>

<template>
  <div v-loading="loading" class="config-panel view-panel">
    <div class="panel-tip">
      <div>
        <h4>分享查看页</h4>
        <p>
          开启后，任何持有任务链接的人可以通过 <code>/task-view/:key</code> 查看实时收集情况。<br>
          可独立配置可见字段、脱敏方式、是否显示未提交名单与文件名，并可选启用访问密码。
        </p>
      </div>
    </div>

    <div class="setting-card">
      <div class="setting-main">
        <div>
          <h5>启用分享查看页</h5>
          <p>关闭后查看页直接返回「未开启」。</p>
        </div>
        <el-switch v-model="enabled" />
      </div>
    </div>

    <template v-if="enabled">
      <div class="setting-card">
        <div class="setting-main">
          <div>
            <h5>访问密码</h5>
            <p>开启后访问查看页需要先输入密码，4-64 位。</p>
          </div>
          <el-switch v-model="needPassword" />
        </div>
        <div v-show="needPassword" class="setting-footer">
          <el-input
            v-model="password"
            type="password"
            placeholder="请输入访问密码"
            show-password
            maxlength="64"
            show-word-limit
          />
        </div>
      </div>

      <div class="setting-card">
        <div class="setting-main">
          <div>
            <h5>显示选项</h5>
            <p>控制查看页是否展示未提交人员名单、是否展示文件名。</p>
          </div>
        </div>
        <div class="setting-footer">
          <el-checkbox v-model="showUnsubmitted">
            显示未提交名单（仅限制名单模式下生效）
          </el-checkbox>
          <el-checkbox v-model="showFileNames">
            显示已提交文件名
          </el-checkbox>
        </div>
      </div>

      <div class="setting-card">
        <div class="setting-main">
          <div>
            <h5>可见字段与脱敏方式</h5>
            <p>勾选要在查看页展示的表单字段，并为每个字段选择脱敏方式。</p>
          </div>
        </div>
        <div class="setting-footer">
          <el-empty v-if="!availableFields.length" description="尚未配置必填信息字段" />
          <div v-else class="fields-grid">
            <div
              v-for="field in visibleFields"
              :key="field.name"
              class="field-row"
            >
              <el-checkbox
                v-model="checkedFieldNames"
                :label="field.name"
              >
                {{ field.name }}
              </el-checkbox>
              <el-select
                v-model="field.mask"
                :disabled="!checkedFieldNames.includes(field.name)"
                size="small"
                style="width: 160px;"
              >
                <el-option
                  v-for="opt in MASK_OPTIONS"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div class="action-row">
      <el-button v-if="enabled" @click="handleCopyLink">
        复制查看链接
      </el-button>
      <el-button v-if="enabled" @click="openPreview">
        预览查看页
      </el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">
        保存
      </el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.config-panel {
  display: grid;
  gap: 16px;
}

.panel-tip,
.setting-card {
  padding: 18px;
  background-color: #fff;
  border: 1px solid #edf2f7;
  border-radius: 14px;
}

.panel-tip {
  background: #f8fbff;

  h4 {
    margin: 0;
    font-size: 16px;
    color: #1f2d3d;
  }

  p {
    margin: 8px 0 0;
    color: #909399;
    line-height: 1.6;
  }

  code {
    padding: 0 4px;
    background: #eef2f7;
    border-radius: 4px;
  }
}

.setting-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  h5 {
    margin: 0;
    font-size: 15px;
    color: #303133;
  }

  p {
    margin: 6px 0 0;
    font-size: 13px;
    color: #909399;
  }
}

.setting-footer {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #edf2f7;
  display: grid;
  gap: 12px;
}

.fields-grid {
  display: grid;
  gap: 8px;
}

.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.action-row {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media screen and (max-width: 700px) {
  .setting-main {
    align-items: stretch;
    flex-direction: column;
  }

  .action-row {
    flex-wrap: wrap;

    .el-button {
      flex: 1;
    }
  }
}
</style>
