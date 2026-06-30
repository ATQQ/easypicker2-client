<script lang="ts" setup>
import type {
  MaskMode,
  RosterConfig,
  ViewConfig,
  ViewVisibleField,
} from '@/apis/modules/taskView'
import { ElMessage } from 'element-plus'
import { computed, nextTick, ref, watch } from 'vue'
import { TaskApi, TaskViewApi } from '@/apis'
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
  people: {
    type: Number,
    default: 0,
  },
  bindField: {
    type: String,
    default: '姓名',
  },
})

const MASK_OPTIONS: { label: string, value: MaskMode }[] = [
  { label: '不脱敏', value: 'none' },
  { label: '只显示首位', value: 'head1' },
  { label: '首尾可见', value: 'head_tail' },
  { label: '尾部可见（自适应）', value: 'tail' },
]

const ROSTER_COLUMN_OPTIONS = [
  { label: '状态（已提交/未提交）', value: 'status' },
  { label: '提交时间', value: 'submitDate' },
]

const DEFAULT_PASSWORD_LENGTH = 6

function genPassword(len = DEFAULT_PASSWORD_LENGTH) {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < len; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

const loading = ref(false)
const saving = ref(false)
const ready = ref(false)

const enabled = ref(false)
const needPassword = ref(false)
const password = ref('')

const visibleFields = ref<ViewVisibleField[]>([])
const checkedFieldNames = ref<string[]>([])

const roster = ref<RosterConfig>({
  enabled: false,
  columns: ['status', 'submitDate'],
  nameMask: 'head_tail',
  showUnsubmitted: true,
})

const limitPeopleOn = computed(() => Number(props.people) === 1)

const availableFields = computed<string[]>(() => {
  const items = parseInfo(props.info) as InfoItem[]
  return items.map(v => v.text || '').filter(v => !!v)
})

const viewUrl = computed(() => (props.k ? `${location.origin}/task-view/${props.k}` : ''))

function defaultMaskFor(name: string): MaskMode {
  return name === (props.bindField || '姓名') ? 'head_tail' : 'tail'
}

function syncVisibleFields(serverFields: ViewVisibleField[]) {
  const fromServer = new Map<string, MaskMode>()
  for (const f of serverFields) {
    if (f && f.name) {
      fromServer.set(f.name, f.mask)
    }
  }
  visibleFields.value = availableFields.value.map(name => ({
    name,
    mask: fromServer.get(name) ?? defaultMaskFor(name),
  }))
}

async function load() {
  if (!props.k)
    return
  loading.value = true
  ready.value = false
  try {
    const res = await TaskViewApi.getViewConfig(props.k)
    const data = ((res as any)?.data ?? res) as {
      viewEnabled: boolean
      viewConfig: ViewConfig
    }
    enabled.value = !!data.viewEnabled
    const cfg = data.viewConfig
    password.value = cfg?.password || ''
    needPassword.value = !!cfg?.password
    const storedVisible = Array.isArray(cfg?.visibleFields) ? cfg.visibleFields : []
    syncVisibleFields(storedVisible)
    checkedFieldNames.value = storedVisible
      .map(v => v.name)
      .filter(name => availableFields.value.includes(name))
    roster.value = {
      enabled: !!cfg?.roster?.enabled,
      columns: Array.isArray(cfg?.roster?.columns) && cfg.roster.columns.length
        ? [...cfg.roster.columns]
        : ['status', 'submitDate'],
      nameMask: cfg?.roster?.nameMask || 'head_tail',
      showUnsubmitted: cfg?.roster?.showUnsubmitted !== false,
    }
  }
  catch {
    ElMessage.error('查看页配置加载失败')
  }
  finally {
    loading.value = false
    await nextTick()
    ready.value = true
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
      mask: existing.get(name) ?? defaultMaskFor(name),
    }))
    checkedFieldNames.value = checkedFieldNames.value.filter(n =>
      availableFields.value.includes(n),
    )
  },
)

// 启用开关：变更即时落库。如果是从「未启用 → 启用」且尚未设置密码，自动生成 6 位密码。
watch(enabled, async (next, prev) => {
  if (!ready.value)
    return
  if (next === prev)
    return
  if (!props.k)
    return
  try {
    if (next && !password.value) {
      // 默认开启访问密码，自动生成
      password.value = genPassword()
      needPassword.value = true
    }
    const payload: TaskApiTypes.TaskInfo = { viewEnabled: next }
    if (next) {
      // 同步带上当前内存配置，避免首次启用时配置仍为空
      payload.viewConfig = buildViewConfigObject()
    }
    await TaskApi.updateTaskMoreInfo(props.k, payload)
    ElMessage.success({
      message: next ? '已开启分享查看' : '已关闭分享查看',
      duration: 1500,
    })
  }
  catch {
    ElMessage.error('设置失败，已回退')
    ready.value = false
    enabled.value = prev
    await nextTick()
    ready.value = true
  }
})

function buildViewConfigObject(): ViewConfig {
  const selectedFields = visibleFields.value.filter(v =>
    checkedFieldNames.value.includes(v.name),
  )
  return {
    password: needPassword.value ? (password.value || '').trim() : '',
    visibleFields: selectedFields,
    roster: {
      enabled: limitPeopleOn.value && roster.value.enabled,
      columns: [...roster.value.columns],
      nameMask: roster.value.nameMask,
      showUnsubmitted: roster.value.showUnsubmitted,
    },
  }
}

function buildPayload(): TaskApiTypes.TaskInfo {
  if (needPassword.value) {
    const t = (password.value || '').trim()
    if (t.length < 4 || t.length > 64) {
      throw new Error('查看密码需为 4-64 位')
    }
  }
  return {
    viewEnabled: enabled.value,
    viewConfig: buildViewConfigObject(),
  }
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

function regeneratePassword() {
  password.value = genPassword()
}
</script>

<template>
  <div v-loading="loading" class="config-panel view-panel">
    <div class="panel-tip">
      <div class="panel-tip-content">
        <h4>分享查看页</h4>
        <p>
          开启后，任何持有以下链接的人可访问实时收集情况。<br>
          未启用名单时默认展示「文件提交记录」；限制名单时可额外开启「名单」Tab，并可单独配置展示列与脱敏方式。
        </p>
        <div class="panel-tip-link">
          <el-input :model-value="viewUrl" readonly size="small" class="panel-tip-link-input">
            <template #append>
              <el-button @click="handleCopyLink">
                复制
              </el-button>
            </template>
          </el-input>
        </div>
      </div>
    </div>

    <div class="setting-card">
      <div class="setting-main">
        <div>
          <h5>启用分享查看页</h5>
          <p>关闭后查看页直接返回「未开启」。首次开启会自动生成 6 位访问密码。</p>
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
          >
            <template #append>
              <el-button @click="regeneratePassword">
                随机
              </el-button>
            </template>
          </el-input>
        </div>
      </div>

      <div class="setting-card">
        <div class="setting-main">
          <div>
            <h5>文件提交记录 Tab</h5>
            <p>勾选要展示的表单字段（按文件平铺），并为每个字段选择脱敏方式。</p>
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
                <span v-if="field.name === (bindField || '姓名')" class="field-bind-hint">绑定</span>
              </el-checkbox>
              <el-select
                v-model="field.mask"
                :disabled="!checkedFieldNames.includes(field.name)"
                size="small"
                style="width: 180px;"
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

      <div v-if="limitPeopleOn" class="setting-card">
        <div class="setting-main">
          <div>
            <h5>名单 Tab</h5>
            <p>启用后查看页将出现独立的「名单」Tab，展示已配置的提交人员名单。</p>
          </div>
          <el-switch v-model="roster.enabled" />
        </div>
        <div v-show="roster.enabled" class="setting-footer">
          <div class="form-line">
            <label class="form-label">展示列</label>
            <el-checkbox-group v-model="roster.columns">
              <el-checkbox
                v-for="opt in ROSTER_COLUMN_OPTIONS"
                :key="opt.value"
                :label="opt.value"
              >
                {{ opt.label }}
              </el-checkbox>
            </el-checkbox-group>
          </div>
          <div class="form-line">
            <label class="form-label">姓名脱敏</label>
            <el-select v-model="roster.nameMask" size="small" style="width: 200px;">
              <el-option
                v-for="opt in MASK_OPTIONS"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </div>
          <div class="form-line">
            <el-checkbox v-model="roster.showUnsubmitted">
              展示未提交人员
            </el-checkbox>
          </div>
        </div>
      </div>
    </template>

    <div class="action-row">
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
}

.panel-tip-link {
  margin-top: 12px;
}

.panel-tip-link-input :deep(.el-input__inner) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: #1f2d3d;
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

.field-bind-hint {
  margin-left: 6px;
  font-size: 12px;
  color: #67c23a;
  background: rgba(103, 194, 58, 0.1);
  padding: 1px 6px;
  border-radius: 4px;
}

.form-line {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.form-label {
  width: 80px;
  color: #606266;
  font-size: 13px;
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

  .form-label {
    width: auto;
  }
}
</style>
