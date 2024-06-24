<template>
  <div class="tc">
    <tip class="title"> ↓下方设置允许提交的文件类型↓ </tip>
    <tip>暂时只支持通过文件名后缀进行卡控，不区分大小写</tip>
    <tip>例如：txt,png,jpeg,webp</tip>
    <div class="tc">
      <el-switch
        active-text="限制文件类型"
        inactive-text="不限制文件类型"
        @change="handleChange"
        :value="formatData.status"
        style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
      />
    </div>
    <div v-show="formatData.status">
      <tip>支持英文逗号","分割，一次添加多个</tip>
      <div style="max-width: 300px; margin: 0 auto">
        <el-input v-model="typeName" placeholder="请输入文件类型（省略.）">
          <template #append>
            <el-button @click="handleAddType"> 确定 </el-button>
          </template>
        </el-input>
      </div>
      <el-tag
        v-for="(tag, idx) in formatData.format"
        :key="idx"
        class="type"
        closable
        :disable-transitions="false"
        @close="handleDelType(idx)"
      >
        {{ tag }}
      </el-tag>
      <tip v-show="formatData.format.length"
        >已添加: <span>{{ formatData.format.join(',') }}</span>
        <el-button type="primary" text size="small" @click="handleCopyType"
          >一键复制</el-button
        >
      </tip>
    </div>
    <div class="split-line"></div>
    <tip class="title"
      >↓下方设置最大同时提交文件数量（16 >= x >=1 默认 10）↓</tip
    >
    <div class="tc">
      <el-input-number
        :model-value="formatData.limit"
        :min="1"
        :max="16"
        @change="handleChangeLimit"
      />
    </div>
    <div class="split-line"></div>
    <tip class="title"> ↓下方设置文件最大的大小↓ </tip>
    <tip>1024B = 1KB, 1024KB = 1MB, 1024MB = 1GB</tip>
    <tip>0表示不限制</tip>
    <div class="tc">
      <el-input-number
        :model-value="inputSize"
        :min="0"
        :max="1024"
        @change="handleLimitSize"
      />
      <el-select
        @change="handleChangeUnit"
        v-model="formatData.sizeUnit"
        placeholder="单位"
        style="width: 100px"
      >
        <el-option v-for="v in unitList" :key="v" :label="v" :value="v" />
      </el-select>
    </div>
    <div class="split-line"></div>
    <tip :style="formatData.size === 0 ? 'color:grey' : 'color:red'">{{
      formatData.size === 0
        ? '不限制大小'
        : `限制为不超过: ${formatSize(formatData.size)}`
    }}</tip>
  </div>
</template>
<script lang="ts" setup>
import { ElMessage } from 'element-plus'
import { reactive, ref, watchEffect } from 'vue'
import {
  copyRes,
  formatSize,
  getDefaultFormat,
  parseFileFormat
} from '@/utils/stringUtil'
import { updateTaskInfo } from '../../public'
import Tip from './tip.vue'

const props = defineProps({
  format: {
    type: String,
    default: '',
    required: false
  },
  k: {
    type: String,
    default: ''
  }
})

const formatData = reactive(getDefaultFormat())
const typeName = ref('')
const updateInfo = () => {
  updateTaskInfo(props.k, {
    format: JSON.stringify(formatData)
  })
}
const handleChange = (v: boolean) => {
  formatData.status = !!v
  updateInfo()
}

const handleAddType = () => {
  const inputValue = typeName.value
    .split(',')
    // 转为小写
    .map((v) => v.trim().toLowerCase())
  for (const v of inputValue) {
    if (formatData.format.includes(v)) {
      ElMessage.error(`${v} 已存在`)
      return
    }
  }

  formatData.format.push(...inputValue)
  updateInfo()

  typeName.value = ''
}
const handleDelType = (idx) => {
  formatData.format.splice(idx, 1)
  updateInfo()
}
const handleCopyType = () => {
  copyRes(formatData.format.join(','))
}

const handleChangeLimit = (limit: number) => {
  formatData.limit = limit
  updateInfo()
}

const inputSize = ref(0)
const unitList = reactive(['B', 'KB', 'MB', 'GB'])
const handleChangeUnit = () => {
  const idx = unitList.findIndex((v) => v === formatData.sizeUnit)
  formatData.size = inputSize.value * 1024 ** idx
  updateInfo()
}
const handleLimitSize = (limit: number) => {
  inputSize.value = limit
  const idx = unitList.findIndex((v) => v === formatData.sizeUnit)
  formatData.size = inputSize.value * 1024 ** idx
  updateInfo()
}

watchEffect(() => {
  if (props.format !== null) {
    Object.assign(formatData, parseFileFormat(props.format))
  }
})
</script>
<style scoped>
.type {
  margin: 10px;
}
.split-line {
  margin-top: 10px;
}
.title {
  color: black;
  font-weight: bold;
}
</style>
