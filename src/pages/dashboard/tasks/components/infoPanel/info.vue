<script lang="ts" setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, reactive, ref, watch, watchEffect } from 'vue'
import {
  CircleCloseFilled,
  CirclePlusFilled,
  Top,
} from '@element-plus/icons-vue'
import { updateTaskInfo } from '../../public'
import Tip from './tip.vue'
import { TaskApi } from '@/apis'
import InfosForm from '@/components/InfosForm/index.vue'
import {
  getDefaultFormat,
  parseFileFormat,
  parseInfo,
} from '@/utils/stringUtil'
import { useIsMobile, useSiteConfig } from '@/composables'

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
function getTypeDes(type: string) {
  return infoTypeList.find(v => v.value === type)?.label
}

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
  updateTaskInfo(props.k, {
    rewrite: +v,
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
  updateTaskInfo(props.k, {
    info: JSON.stringify(
      infos.map((v) => {
        // 特殊处理固定值的内容
        if (v.type === 'text') {
          v.value = v.text
        }
        return v
      }),
    ),
  })
  needSave.value = false
}

function moveInfoUp(idx: number) {
  if (idx === 0)
    return
  const temp = infos[idx - 1]
  infos.splice(idx - 1, 1)
  infos.splice(idx, 0, temp)
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
  updateTaskInfo(props.k, {
    format: JSON.stringify(formatData),
  })
}
const splitCharList = reactive(['-', '+', '_'])
watchEffect(() => {
  if (props.format !== null) {
    Object.assign(formatData, parseFileFormat(props.format))
  }
})
</script>

<template>
  <div class="tc">
    <Tip
      :imgs="[
        'https://img.cdn.sugarat.top/mdImg/MTY1MDE4MzM3NjUyNg==650183376526',
        'https://img.cdn.sugarat.top/mdImg/MTY1MTQ5NjU2ODcyNg==651496568726',
      ]"
    >
      上传文件必填表单信息
    </Tip>
    <div class="auto-format">
      <span>文件自动重命名:</span>
      <el-switch
        v-model="autoRewrite"
        style="display: block"
        active-color="#13ce66"
        inactive-color="#ff4949"
        active-text="开"
        inactive-text="关"
        @change="handleChange"
      />
    </div>
    <div v-if="autoRewrite" style="margin-bottom: 10px">
      预期格式:
      <span style="color: #409eff">{{ resFormat }}</span>
    </div>
    <div v-if="autoRewrite" style="margin-bottom: 10px">
      分割符：
      <el-select
        v-model="formatData.splitChar"
        placeholder="分隔符"
        style="width: 60px"
        size="small"
        @change="handleChangeSplitChar"
      >
        <el-option v-for="v in splitCharList" :key="v" :label="v" :value="v" />
      </el-select>
    </div>
    <Tip v-if="autoRewrite" style="color: red">
      开启自动重命名后，重点关注文件名格式是否符合预期
    </Tip>
    <div>
      预览
      <el-switch
        v-model="openPreview"
        inline-prompt
        active-text="是"
        inactive-text="否"
        active-color="#13ce66"
        inactive-color="#ff4949"
      />
    </div>
    <!-- 必填信息区域 -->
    <div class="form-wrapper">
      <InfosForm v-if="openPreview" :infos="infos" :disabled="openPreview" />
      <el-form v-else label-width="100px">
        <el-form-item v-for="(item, idx) in infos" :key="idx">
          <template #label>
            <div class="flex fc fac">
              <div class="num-wrapper">
                <div>{{ idx + 1 }}</div>
              </div>
              <div class="form-item-type" :class="item.type">
                {{ getTypeDes(item.type) }}
              </div>
            </div>
          </template>
          <el-input
            v-model="item.text"
            placeholder="输入内容"
            :maxlength="maxInputLength"
            clearable
            show-word-limit
          >
            <template #append>
              <div class="form-item-wrapper">
                <el-icon
                  :color="infos.length > 1 ? 'red' : 'grey'"
                  @click="deleteInfo(idx)"
                >
                  <CircleCloseFilled />
                </el-icon>
                <el-icon
                  v-if="idx > 0"
                  color="#000"
                  style="margin-left: 6px"
                  @click="moveInfoUp(idx)"
                >
                  <Top />
                </el-icon>
              </div>
            </template>
          </el-input>
          <div
            v-if="item.type === 'radio' || item.type === 'select'"
            class="radio-list"
          >
            <el-input
              v-for="(v, idx2) in item.children"
              :key="idx2"
              v-model="v.text"
              size="small"
              placeholder="输入内容"
              :maxlength="maxInputLength"
              clearable
              show-word-limit
            >
              <template #append>
                <div class="form-item-wrapper">
                  <el-icon
                    :color="item.children.length > 2 ? 'red' : 'grey'"
                    @click="deleteInfo(idx2, item.children, 2)"
                  >
                    <CircleCloseFilled />
                  </el-icon>
                  <template v-if="idx2 + 1 === item.children.length">
                    <el-icon
                      style="margin-left: 10px"
                      color="#67C23A"
                      @click="addInfo(item.children, item.type)"
                    >
                      <CirclePlusFilled />
                    </el-icon>
                  </template>
                </div>
              </template>
            </el-input>
          </div>
        </el-form-item>
      </el-form>
    </div>
    <div v-if="showAddInfo" class="p10">
      <el-button
        size="small"
        type="primary"
        round
        @click="
          () => {
            addInfo()
          }
        "
      >
        添加一项
      </el-button>
      <el-select
        v-model="selectType"
        style="margin: 0 10px"
        size="small"
        placeholder="选择添加的类型"
      >
        <el-option
          v-for="(v, idx) in infoTypeList"
          :key="idx"
          :label="v.label"
          :value="v.value"
        />
      </el-select>
      <el-button type="primary" text @click="showHelp">
        提示❓
      </el-button>
    </div>
    <!-- 从其它任务导入 -->
    <el-button size="small" type="warning" @click="openImportPanel">
      从其它任务导入
    </el-button>
    <div class="p10">
      <Tip>支持从已有的任务直接导入表单信息</Tip>
      <el-button type="success" style="width: 200px" @click="saveInfo">
        保存
      </el-button>
    </div>
    <div v-if="needSave" style="color: red">
      有变动，请记得点击保存
    </div>
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
.auto-format {
  display: flex;
  justify-content: center;
}

:deep(.el-form-item__label) {
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.num-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #000;
  text-align: center;
  font-size: 14px;
}

.info-panel :deep(.el-form-item__label) {
  flex: v-bind(importPanelFlexStyle);
  justify-content: flex-end;
}

.form-wrapper {
  max-width: 380px;
  margin: 0 auto;
}

.form-wrapper :deep(.el-input-group__append) {
  background-color: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
}

.form-item-wrapper {
  width: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.form-item-type {
  margin-left: 10px;
  font-size: 12px;
  width: 48px;
  text-align: left;
}

.radio-list {
  padding-top: 10px;
}

.radio-list :deep(.el-input) {
  width: 80%;
}
</style>
