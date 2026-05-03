<script lang="ts" setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, reactive, ref, watch, watchEffect } from 'vue'
import { TaskApi } from '@/apis'
import InfosForm from '@/components/InfosForm/index.vue'
import { useIsMobile, useSiteConfig } from '@/composables'
import {
  getDefaultFormat,
  parseFileFormat,
  parseInfo,
} from '@/utils/stringUtil'
import { updateTaskInfo } from '../../public'
import Tip from './tip.vue'

const props = defineProps({
  rewrite: {
    type: Number,
    default: 0,
  },
  info: {
    typs: String,
    default: '[]',
  },
  k: {
    type: String,
    default: '',
  },
  format: {
    type: String,
    default: '',
    required: false,
  },
})
const emit = defineEmits<{
  'update:format': [value: string]
  'update:info': [value: string]
  'update:rewrite': [value: number]
}>()
const formatData = reactive(getDefaultFormat())
const openPreview = ref(false)
const infoTypeList = reactive<{ label: string, value: InfoItemType }[]>([
  {
    label: '输入框',
    value: 'input',
  },
  {
    label: '固定内容',
    value: 'text',
  },
  {
    label: '单选框',
    value: 'radio',
  },
  {
    label: '下拉选择',
    value: 'select',
  },
])
const selectType = ref<InfoItemType>('input')

const { value: siteConfig } = useSiteConfig()
const maxInputLength = computed(() => siteConfig.value.maxInputLength)

const autoRewrite = ref(false)
const infos = reactive<InfoItem[]>([])
const needSave = ref(false)

const showAddInfo = computed(() => infos.length < siteConfig.value.formLength && !openPreview.value)
// 负责清空&更新
watch(
  () => props.info,
  () => {
    infos.splice(0, infos.length)
    selectType.value = 'input'
    openPreview.value = false
    infos.push(...parseInfo(props.info))
    needSave.value = false
  },
  {
    immediate: true,
  },
)

// 预计格式
const resFormat = computed(
  () => `${infos.map(v => v.text).join(formatData.splitChar)}.后缀`,
)
watchEffect(() => {
  autoRewrite.value = !!props.rewrite
})
function handleChange(v: boolean) {
  const rewrite = +v
  emit('update:rewrite', rewrite)
  updateTaskInfo(props.k, {
    rewrite,
  })
}

function addInfo(infoList?: InfoItem[], type?: InfoItemType) {
  const list = infoList || infos
  const t = type || selectType.value
  const item: InfoItem = { text: `标题${list.length + 1}`, type: t, value: '' }
  if (t === 'radio' || t === 'select') {
    item.children = [{ text: '选项1' }, { text: '选项2' }]
  }
  list.push(item)
  needSave.value = true
}
function deleteInfo(idx: number, infoList?: InfoItem[], minLen = 1) {
  const list = infoList || infos
  if (list.length <= minLen) {
    return
  }
  list.splice(idx, 1)
  needSave.value = true
}
function judgeInfoForm(items: InfoItem[]) {
  return items.every(v => v.text.trim() && judgeInfoForm(v.children || []))
}
function saveInfo() {
  if (!judgeInfoForm(infos)) {
    ElMessage.error('请完整填写表单信息')
    setTimeout(() => {
      ElMessage.warning('不能有空项')
    }, 100)
    return
  }
  const nextInfo = JSON.stringify(
    infos.map((v) => {
      // 特殊处理固定值的内容
      if (v.type === 'text') {
        v.value = v.text
      }
      return v
    }),
  )
  emit('update:info', nextInfo)
  updateTaskInfo(props.k, { info: nextInfo })
  needSave.value = false
}

function markInfoChanged() {
  needSave.value = true
}

function moveInfoUp(idx: number) {
  if (idx === 0)
    return
  const temp = infos[idx - 1]
  infos.splice(idx - 1, 1)
  infos.splice(idx, 0, temp)
  markInfoChanged()
}

function handleChangeInfoType(item: InfoItem, type: string) {
  const nextType = type as InfoItemType
  item.type = nextType
  if (nextType === 'radio' || nextType === 'select') {
    item.children = item.children?.length
      ? item.children
      : [{ text: '选项1' }, { text: '选项2' }]
  }
  else {
    delete item.children
  }
  markInfoChanged()
}

const importPanelInfo = reactive({ taskList: [], taskValue: '' })
const showImportPanel = ref(false)
async function openImportPanel() {
  const taskKey = props.k
  // 通过任务Key获取可用任务列表，与概况信息
  const { data } = await TaskApi.getUsefulTemplate(taskKey)
  importPanelInfo.taskList = data
  importPanelInfo.taskValue = data[0]?.taskKey || ''
  showImportPanel.value = true
}

function handleSaveImportInfo() {
  const usefulInfo = importPanelInfo.taskList.find(
    v => v.taskKey === importPanelInfo.taskValue,
  ).info
  infos.splice(0, infos.length)
  infos.push(...parseInfo(usefulInfo))
  showImportPanel.value = false
  needSave.value = true
}

const isMobile = useIsMobile()
const importPanelFlexStyle = computed(() => (isMobile.value ? '0 0 auto' : 0.5))

function showHelp() {
  ElMessageBox.alert(
    '<p>固定内容主要用于重命名中，固定的部分，如“活动名”，“班级名”</p><p>如要设置注意事项，请使用 <strong>批注</strong> 功能</p>',
    '注意事项',
    { dangerouslyUseHTMLString: true },
  )
}

function handleChangeSplitChar() {
  const format = JSON.stringify(formatData)
  emit('update:format', format)
  updateTaskInfo(props.k, { format })
}
const splitCharList = reactive(['-', '+', '_'])
watchEffect(() => {
  if (props.format !== null) {
    Object.assign(formatData, parseFileFormat(props.format))
  }
})
</script>

<template>
  <div class="config-panel">
    <el-alert
      title="配置用户提交文件时需要填写的表单字段。开启自动重命名后，字段顺序会影响最终文件名。"
      type="info"
      show-icon
      :closable="false"
    />

    <section class="feature-grid">
      <div class="feature-card" :class="{ active: autoRewrite }">
        <div class="feature-copy">
          <el-tag :type="autoRewrite ? 'success' : 'info'" effect="light">
            {{ autoRewrite ? '已开启' : '未开启' }}
          </el-tag>
          <h4>文件自动重命名</h4>
          <p>开启后会根据表单字段生成文件名，建议保存后先预览效果。</p>
        </div>
        <el-switch
          v-model="autoRewrite"
          size="large"
          active-text="开"
          inactive-text="关"
          @change="handleChange"
        />
        <div v-if="autoRewrite" class="format-preview">
          <div class="format-preview-main">
            <span>预期格式</span>
            <strong>{{ resFormat }}</strong>
          </div>
          <label class="split-char-field">
            <span>分隔符</span>
            <el-select
              v-model="formatData.splitChar"
              placeholder="分隔符"
              size="small"
              @change="handleChangeSplitChar"
            >
              <el-option v-for="v in splitCharList" :key="v" :label="v" :value="v" />
            </el-select>
          </label>
        </div>
      </div>

      <div class="feature-card" :class="{ active: openPreview }">
        <div class="feature-copy">
          <el-tag :type="openPreview ? 'primary' : 'info'" effect="light">
            {{ openPreview ? '预览中' : '编辑中' }}
          </el-tag>
          <h4>编辑 / 预览</h4>
          <p>编辑模式维护字段，预览模式查看用户侧填写效果。</p>
        </div>
        <el-radio-group
          v-model="openPreview"
          class="mode-switch"
          size="large"
        >
          <el-radio-button :label="false">
            编辑
          </el-radio-button>
          <el-radio-button :label="true">
            预览
          </el-radio-button>
        </el-radio-group>
      </div>
    </section>

    <section class="builder-card">
      <div class="builder-header">
        <div>
          <h4>字段列表</h4>
          <p>按问卷题目方式维护字段：标题、类型、选项和排序都在题目卡片内完成。</p>
        </div>
        <el-button text type="primary" @click="showHelp">
          字段说明
        </el-button>
      </div>

      <div class="form-wrapper">
        <InfosForm v-if="openPreview" :infos="infos" :disabled="openPreview" />
        <div v-else class="field-list">
          <div v-for="(item, idx) in infos" :key="idx" class="field-card">
            <div class="question-head">
              <div class="question-title">
                <span class="field-index">Q{{ idx + 1 }}</span>
                <strong>{{ item.text || '未命名字段' }}</strong>
              </div>
              <el-select
                :model-value="item.type"
                class="question-type"
                @change="v => handleChangeInfoType(item, v)"
              >
                <el-option
                  v-for="type in infoTypeList"
                  :key="type.value"
                  :label="type.label"
                  :value="type.value"
                />
              </el-select>
            </div>

            <div class="question-body">
              <label class="field-label">字段标题</label>
              <el-input
                v-model="item.text"
                placeholder="请输入展示给用户的字段标题"
                :maxlength="maxInputLength"
                clearable
                show-word-limit
                @input="markInfoChanged"
              />

              <div
                v-if="item.type === 'radio' || item.type === 'select'"
                class="option-list"
              >
                <div class="option-title">
                  <span>选项列表</span>
                  <el-button
                    size="small"
                    text
                    type="primary"
                    @click="addInfo(item.children, item.type)"
                  >
                    添加选项
                  </el-button>
                </div>
                <div
                  v-for="(v, idx2) in item.children"
                  :key="idx2"
                  class="option-item"
                >
                  <span>{{ idx2 + 1 }}</span>
                  <el-input
                    v-model="v.text"
                    size="small"
                    placeholder="输入选项内容"
                    :maxlength="maxInputLength"
                    clearable
                    show-word-limit
                    @input="markInfoChanged"
                  />
                  <el-button
                    size="small"
                    text
                    type="danger"
                    :disabled="item.children.length <= 2"
                    @click="deleteInfo(idx2, item.children, 2)"
                  >
                    删除
                  </el-button>
                </div>
              </div>
            </div>

            <div class="field-actions">
              <el-button
                v-if="idx > 0"
                size="small"
                text
                type="primary"
                @click="moveInfoUp(idx)"
              >
                上移
              </el-button>
              <el-button
                size="small"
                text
                type="danger"
                :disabled="infos.length <= 1"
                @click="deleteInfo(idx)"
              >
                删除
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <el-alert
        v-if="!openPreview"
        class="builder-alert"
        title="单选框和下拉选择至少保留 2 个选项；固定内容会作为文件名的一部分，不建议用于普通提示。"
        type="info"
        show-icon
        :closable="false"
      />

      <div class="builder-toolbar">
        <div v-if="showAddInfo" class="add-actions">
          <el-select
            v-model="selectType"
            size="default"
            placeholder="选择字段类型"
          >
            <el-option
              v-for="(v, idx) in infoTypeList"
              :key="idx"
              :label="v.label"
              :value="v.value"
            />
          </el-select>
          <el-button type="primary" @click="addInfo()">
            添加字段
          </el-button>
        </div>
        <div class="save-actions">
          <el-button type="warning" plain @click="openImportPanel">
            从其它任务导入
          </el-button>
          <el-button type="success" @click="saveInfo">
            保存表单
          </el-button>
        </div>
      </div>
      <el-alert
        v-if="needSave"
        class="save-alert"
        title="表单信息有变动，请记得保存"
        type="warning"
        show-icon
        :closable="false"
      />
    </section>

    <div class="info-panel">
      <el-dialog
        v-model="showImportPanel"
        :fullscreen="isMobile"
        title="表单信息导入"
      >
        <el-form
          :model="importPanelInfo"
          label-width="100px"
          label-position="right"
        >
          <el-form-item label="任务">
            <el-select
              v-model="importPanelInfo.taskValue"
              filterable
              placeholder="请选择"
              no-data-text="无可用任务"
            >
              <el-option
                v-for="t in importPanelInfo.taskList"
                :key="t.taskKey"
                :label="t.name"
                :value="t.taskKey"
              />
            </el-select>
          </el-form-item>
          <Tip>{{ importPanelInfo.taskValue ? '' : '无可用任务' }}</Tip>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="showImportPanel = false">取 消</el-button>
            <el-button
              :disabled="!importPanelInfo.taskValue"
              type="primary"
              @click="handleSaveImportInfo"
            >确 定
            </el-button>
          </span>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<style scoped lang="scss">
.config-panel {
  display: grid;
  gap: 16px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.feature-card,
.builder-card {
  padding: 18px;
  background-color: #fff;
  border: 1px solid #edf2f7;
  border-radius: 14px;
}

.feature-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &.active {
    border-color: #b3d8ff;
    box-shadow: 0 10px 24px rgba(64, 158, 255, 0.08);
  }
}

.feature-copy {
  min-width: 0;
  flex: 1;

  h4 {
    margin: 12px 0 0;
    font-size: 17px;
    color: #1f2d3d;
  }

  p {
    margin: 8px 0 0;
    font-size: 13px;
    color: #909399;
    line-height: 1.6;
  }
}

.format-preview {
  display: grid;
  gap: 10px;
  flex: 0 0 100%;
  padding: 12px;
  background-color: #f8fbff;
  border-radius: 12px;
}

.format-preview-main,
.split-char-field {
  display: flex;
  align-items: center;
  gap: 12px;

  span {
    flex: 0 0 auto;
    color: #909399;
  }
}

.format-preview-main {
  strong {
    flex: 1;
    min-width: 0;
    color: #409eff;
    word-break: break-all;
  }
}

.split-char-field {
  margin: 0;

  .el-select {
    width: 90px;
  }
}

.mode-switch {
  white-space: nowrap;
}

.info-panel :deep(.el-form-item__label) {
  flex: v-bind(importPanelFlexStyle);
  justify-content: flex-end;
}

.builder-card {
  padding: 0;
  overflow: hidden;
}

.builder-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  background: linear-gradient(180deg, #ffffff 0%, #fafcff 100%);
  border-bottom: 1px solid #edf2f7;

  h4 {
    margin: 0;
    font-size: 17px;
    color: #1f2d3d;
  }

  p {
    margin: 8px 0 0;
    font-size: 13px;
    color: #909399;
    line-height: 1.6;
  }
}

.form-wrapper {
  padding: 18px 20px 0;
}

.field-list {
  display: grid;
  gap: 14px;
}

.field-card {
  overflow: hidden;
  background-color: #fff;
  border: 1px solid #edf2f7;
  border-radius: 14px;
  box-shadow: 0 8px 20px rgba(31, 45, 61, 0.04);
}

.question-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  background-color: #fafcff;
  border-bottom: 1px solid #edf2f7;
}

.question-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;

  strong {
    overflow: hidden;
    color: #303133;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.field-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 30px;
  padding: 0 10px;
  color: #409eff;
  font-weight: 600;
  background-color: #ecf5ff;
  border-radius: 999px;
}

.question-type {
  width: 140px;
  flex: 0 0 auto;
}

.question-body {
  display: grid;
  gap: 10px;
  padding: 16px;
}

.field-label,
.option-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}

.option-list {
  display: grid;
  gap: 10px;
  margin-top: 8px;
  padding: 12px;
  background-color: #fafcff;
  border: 1px dashed #dcdfe6;
  border-radius: 12px;
}

.option-title,
.option-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.option-title {
  justify-content: space-between;
}

.option-item > span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #909399;
  background-color: #fff;
  border-radius: 50%;
}

.field-actions,
.builder-toolbar,
.add-actions,
.save-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.field-actions {
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid #edf2f7;
}

.builder-alert {
  margin: 16px 20px 0;
}

.builder-toolbar {
  justify-content: space-between;
  flex-wrap: wrap;
  margin: 18px 20px 0;
  padding: 16px 0 18px;
  border-top: 1px solid #edf2f7;
}

.add-actions .el-select {
  width: 150px;
}

.save-alert {
  margin: 14px 20px 18px;
}

@media screen and (max-width: 700px) {
  .feature-grid {
    grid-template-columns: 1fr;
  }

  .feature-card,
  .builder-header,
  .question-head,
  .option-title,
  .option-item,
  .builder-toolbar,
  .add-actions,
  .save-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .format-preview {
    flex: none;
    width: auto;
  }

  .format-preview-main,
  .split-char-field {
    align-items: stretch;
    flex-direction: column;
    gap: 6px;
  }

  .mode-switch {
    width: 100%;
  }

  .mode-switch :deep(.el-radio-button) {
    width: 50%;
  }

  .mode-switch :deep(.el-radio-button__inner) {
    width: 100%;
  }

  .question-type,
  .split-char-field .el-select {
    width: 100%;
  }

  .form-wrapper {
    padding: 14px 12px 0;
  }

  .builder-alert,
  .builder-toolbar,
  .save-alert {
    margin-right: 12px;
    margin-left: 12px;
  }

  .add-actions .el-select,
  .save-actions .el-button {
    width: 100%;
  }
}
</style>
