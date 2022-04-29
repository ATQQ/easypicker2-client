<template>
  <div class="tc">
    <tip :imgs="[
      'https://img.cdn.sugarat.top/mdImg/MTY1MDE4MzM3NjUyNg==650183376526',
    ]">上传文件必填表单信息</tip>
    <div class="auto-format">
      <span>文件自动重命名:</span>
      <el-switch style="display: block" v-model="autoRewrite" active-color="#13ce66" inactive-color="#ff4949"
        active-text="开" @change="handleChange" inactive-text="关"></el-switch>
    </div>
    <div v-if="autoRewrite" style="margin-bottom: 10px;">
      预期格式:
      <span style="color: #409EFF;">{{ resFormat }}</span>
    </div>
    <div>
      预览
      <el-switch v-model="openPreview" inline-prompt active-text="是" inactive-text="否" active-color="#13ce66"
        inactive-color="#ff4949" />
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
              <div class="form-item-type" :class="item.type">{{ getTypeDes(item.type) }}</div>
            </div>
          </template>
          <el-input placeholder="输入内容" v-model="item.text" :maxlength="maxInputLength" clearable show-word-limit>
            <template #append>
              <div class="form-item-wrapper">
                <el-icon :color="infos.length > 1 ? 'red' : 'grey'" @click="deleteInfo(idx)">
                  <CircleCloseFilled />
                </el-icon>
                <el-icon color="#000" style="margin-left: 6px;" v-if="idx > 0" @click="moveInfoUp(idx)">
                  <Top />
                </el-icon>
              </div>
            </template>
          </el-input>
          <div v-if="item.type === 'radio' || item.type === 'select'" class="radio-list">
            <el-input size="small" v-for="(v, idx) in item.children" :key="idx" placeholder="输入内容" v-model="v.text"
              :maxlength="maxInputLength" clearable show-word-limit>
              <template #append>
                <div class="form-item-wrapper">
                  <el-icon :color="item.children.length > 2 ? 'red' : 'grey'"
                    @click="deleteInfo(idx, item.children, 2)">
                    <CircleCloseFilled />
                  </el-icon>
                  <template v-if="idx + 1 === item.children.length">
                    <el-icon style="margin-left: 10px;" color="#67C23A" @click="addInfo(item.children, item.type)">
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
    <div class="p10" v-if="showAddInfo">
      <el-button size="small" type="primary" @click="() => {
        addInfo()
      }" round>添加一项</el-button>
      <el-select style="margin:0 10px" size="small" v-model="selectType" placeholder="选择添加的类型">
        <el-option v-for="(v, idx) in infoTypeList" :key="idx" :label="v.label" :value="v.value" />
      </el-select>
    </div>
    <!-- 从其它任务导入 -->
    <el-button size="small" type="warning" @click="openImportPanel">从其它任务导入</el-button>
    <div class="p10">
      <tip>支持从已有的任务直接导入表单信息</tip>
      <el-button type="success" @click="saveInfo" style="width: 200px;">保存</el-button>
    </div>
    <div style="color: red;" v-if="needSave">有变动，请记得点击保存</div>
    <div class="info-panel">
      <el-dialog :fullscreen="isMobile" title="表单信息导入" v-model="showImportPanel">
        <el-form :model="importPanelInfo" label-width="100px" label-position="right">
          <el-form-item label="任务">
            <el-select filterable v-model="importPanelInfo.taskValue" placeholder="请选择" no-data-text="无可用任务">
              <el-option v-for="t in importPanelInfo.taskList" :key="t.taskKey" :label="t.name" :value="t.taskKey">
              </el-option>
            </el-select>
          </el-form-item>
          <tip>{{ importPanelInfo.taskValue ? "" : "无可用任务" }}</tip>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="showImportPanel = false">取 消</el-button>
            <el-button :disabled="!importPanelInfo.taskValue" type="primary" @click="handleSaveImportInfo">确 定
            </el-button>
          </span>
        </template>
      </el-dialog>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ElMessage } from 'element-plus'
import {
  computed, reactive, ref, watch, watchEffect,
} from 'vue'
import { CircleCloseFilled, CirclePlusFilled, Top } from '@element-plus/icons-vue'
import { useStore } from 'vuex'
import { updateTaskInfo } from '../../public'
import Tip from './tip.vue'
import { TaskApi } from '@/apis'
import InfosForm from '@/components/InfosForm/index.vue'
import { parseInfo } from '@/utils/stringUtil'

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
})
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
const getTypeDes = (type: string) => infoTypeList.find((v) => v.value === type)?.label

const selectType = ref<InfoItemType>('input')

const maxInputLength = +import.meta.env.VITE_APP_INPUT_MAX_LENGTH || 10

const autoRewrite = ref(false)
const infos = reactive<InfoItem[]>([])
const needSave = ref(false)
const showAddInfo = computed(() => infos.length < 6 && !openPreview.value)
// 负责清空
watch(() => props.info, () => {
  infos.splice(0, infos.length)
  selectType.value = 'input'
  openPreview.value = false
})
// 负责更新
watchEffect(() => {
  infos.push(...parseInfo(props.info))
  needSave.value = false
})

// 预计格式
const resFormat = computed(() => `${infos.map((v) => v.text).join('-')}.后缀`)
watchEffect(() => {
  autoRewrite.value = !!props.rewrite
})
const handleChange = (v: boolean) => {
  updateTaskInfo(props.k, {
    rewrite: +v,
  })
}

const addInfo = (infoList?: InfoItem[], type?: InfoItemType) => {
  const list = infoList || infos
  const t = type || selectType.value
  const item: InfoItem = { text: `标题${list.length + 1}`, type: t, value: '' }
  if (t === 'radio' || t === 'select') {
    item.children = [{ text: '选项1' }, { text: '选项2' }]
  }
  list.push(item)
  needSave.value = true
}
const deleteInfo = (idx: number, infoList?: InfoItem[], minLen = 1) => {
  const list = infoList || infos
  if (list.length <= minLen) {
    return
  }
  list.splice(idx, 1)
  needSave.value = true
}
const judgeInfoForm = (items: InfoItem[]) => items.every((v) => v.text.trim() && judgeInfoForm(v.children || []))
const saveInfo = () => {
  if (!judgeInfoForm(infos)) {
    ElMessage.error('请完整填写表单信息')
    setTimeout(() => {
      ElMessage.warning('不能有空项')
    }, 100)
    return
  }
  updateTaskInfo(props.k, {
    info: JSON.stringify(infos.map((v) => {
      // 特殊处理固定值的内容
      if (v.type === 'text') {
        v.value = v.text
      }
      return v
    })),
  })
  needSave.value = false
}

const moveInfoUp = (idx: number) => {
  if (idx === 0) return
  const temp = infos[idx - 1]
  infos.splice(idx - 1, 1)
  infos.splice(idx, 0, temp)
}

const importPanelInfo = reactive({ taskList: [], taskValue: '' })
const showImportPanel = ref(false)
const openImportPanel = async () => {
  const taskKey = props.k
  // 通过任务Key获取可用任务列表，与概况信息
  const { data } = (await TaskApi.getUsefulTemplate(taskKey))
  importPanelInfo.taskList = data
  importPanelInfo.taskValue = data[0]?.taskKey || ''
  showImportPanel.value = true
}

const handleSaveImportInfo = () => {
  const usefulInfo = importPanelInfo.taskList.find((v) => v.taskKey === importPanelInfo.taskValue).info
  infos.splice(0, infos.length)
  infos.push(...parseInfo(usefulInfo))
  showImportPanel.value = false
  needSave.value = true
}

const $store = useStore()
const isMobile = computed(() => $store.getters['public/isMobile'])
const importPanelFlexStyle = computed(() => (isMobile.value ? '0 0 auto' : 0.5))

</script>
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
  // TODO：待定颜色
  // &.input{
  //   color: black;
  // }
  // &.text{
  //   color: #000000;
  // }
  // &.radio{
  //   color: #999;
  // }
}

.radio-list {
  padding-top: 10px;
}

.radio-list :deep(.el-input) {
  width: 80%;
}
</style>
