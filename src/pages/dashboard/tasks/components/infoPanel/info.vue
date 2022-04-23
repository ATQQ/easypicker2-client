<template>
  <div class="tc">
    <tip :imgs="[
      'https://img.cdn.sugarat.top/mdImg/MTY1MDE4MzM3NjUyNg==650183376526',
    ]">上传文件必填表单信息</tip>
    <div class="auto-format">
      <span>文件自动重命名:</span>
      <el-switch style="display: block" v-model="autoRewrite" active-color="#13ce66" inactive-color="#ff4949"
        active-text="开" @change="hanleChange" inactive-text="关"></el-switch>
    </div>
    <div v-if="autoRewrite" class="p10">
      预期格式:
      <span style="color: #409EFF;">{{ resFormat }}</span>
    </div>
    <!-- 必填信息区域 -->
    <div class="form-wrapper">
      <el-form label-width="40px">
        <el-form-item v-for="(item, idx) in infos" :key="idx">
          <template #label>
            <div class="num-wrapper">
              <div>{{ idx + 1 }}</div>
            </div>
          </template>
          <el-input placeholder="输入内容" v-model="item.text" :maxlength="maxInputLength" clearable show-word-limit>
            <template #append>
              <div class="form-item-wrapper">
                <el-icon :color="infos.length > 1 ? 'red' : 'grey'" @click="deleteInfo(idx)">
                  <CircleCloseFilled />
                </el-icon>
              </div>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
    </div>
    <div class="p10">
      <el-button size="small" type="primary" @click="addInfo" round v-if="infos.length < 6
      ">添加一项</el-button>
      <el-button size="small" type="success" @click="saveInfo" round>保存</el-button>
    </div>
    <!-- 从其它任务导入 -->
    <el-button size="small" type="success" @click="openImportPanel">从其它任务导入</el-button>
    <div class="p10">
      <tip>支持从已有的任务直接导入表单信息</tip>
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
import { CircleCloseFilled } from '@element-plus/icons-vue'
import { useStore } from 'vuex'
import { updateTaskInfo } from '../../public'
import Tip from './tip.vue'
import { TaskApi } from '@/apis'

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

const maxInputLength = +import.meta.env.VITE_APP_INPUT_MAX_LENGTH || 10

const autoRewrite = ref(false)
const infos: any[] = reactive([])
const needSave = ref(false)

// 负责清空
watch(() => props.info, () => {
  infos.splice(0, infos.length)
})
// 负责更新
watchEffect(() => {
  infos.push(...JSON.parse(props.info).map((v: string) => ({ text: v })))
  needSave.value = false
})

// 预计格式
const resFormat = computed(() => `${infos.map((v) => v.text).join('-')}.后缀`)
watchEffect(() => {
  autoRewrite.value = !!props.rewrite
})
const hanleChange = (v: boolean) => {
  updateTaskInfo(props.k, {
    rewrite: +v,
  })
}

const addInfo = () => {
  infos.push({ text: `标题${infos.length + 1}` })
  needSave.value = true
}
const deleteInfo = (idx: number) => {
  if (infos.length === 1) {
    return
  }
  infos.splice(idx, 1)
  needSave.value = true
}

const saveInfo = () => {
  const data: string[] = []
  // eslint-disable-next-line no-restricted-syntax
  for (const v of infos) {
    if (!v.text) {
      ElMessage.warning('不能有空项')
      return
    }
    data.push(v.text)
  }
  updateTaskInfo(props.k, {
    info: JSON.stringify(data),
  })
  needSave.value = false
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

// TODO:支持单选，多选等等
const handleSaveImportInfo = () => {
  const usefulInfo = importPanelInfo.taskList.find((v) => v.taskKey === importPanelInfo.taskValue).info
  infos.splice(0, infos.length)
  infos.push(...JSON.parse(usefulInfo).map((v: string) => ({ text: v })))
  showImportPanel.value = false
  needSave.value = true
}

const $store = useStore()
const isMobile = computed(() => $store.getters['public/isMobile'])
const importPanelFlexStyle = computed(() => (isMobile.value ? '0 0 auto' : 0.5))
</script>
<style scoped>
.auto-format {
  display: flex;
  justify-content: center;
}

:deep(.el-form-item__label) {
  display: flex;
  align-items: center;
  justify-content: center;
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
}

.info-panel :deep(.el-form-item__label) {
  flex: v-bind(importPanelFlexStyle);
  justify-content: flex-end;
}

.form-wrapper :deep(.el-input-group__append) {
  background-color: transparent;
  border: none;
  padding: 0;
}

.form-item-wrapper {
  width: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
