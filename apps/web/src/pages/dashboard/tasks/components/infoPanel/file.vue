<script lang="ts" setup>
import { ElMessage } from 'element-plus'
import { reactive, ref, watchEffect } from 'vue'
import {
  copyRes,
  formatSize,
  getDefaultFormat,
  parseFileFormat,
} from '@/utils/stringUtil'
import { updateTaskInfo } from '../../public'

const props = defineProps({
  format: {
    type: String,
    default: '',
    required: false,
  },
  k: {
    type: String,
    default: '',
  },
})

const formatData = reactive(getDefaultFormat())
const typeName = ref('')
function updateInfo() {
  updateTaskInfo(props.k, {
    format: JSON.stringify(formatData),
  })
}
function handleChange(v: boolean) {
  formatData.status = !!v
  updateInfo()
}

function handleAddType() {
  const inputValue = typeName.value
    .split(',')
    // 转为小写
    .map(v => v.trim().toLowerCase())
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
function handleDelType(idx) {
  formatData.format.splice(idx, 1)
  updateInfo()
}
function handleCopyType() {
  copyRes(formatData.format.join(','))
}

function handleChangeLimit(limit: number) {
  formatData.limit = limit
  updateInfo()
}

const inputSize = ref(0)
const unitList = reactive(['B', 'KB', 'MB', 'GB'])
function handleChangeUnit() {
  const idx = unitList.findIndex(v => v === formatData.sizeUnit)
  formatData.size = inputSize.value * 1024 ** idx
  updateInfo()
}
function handleLimitSize(limit: number) {
  inputSize.value = limit
  const idx = unitList.findIndex(v => v === formatData.sizeUnit)
  formatData.size = inputSize.value * 1024 ** idx
  updateInfo()
}

watchEffect(() => {
  if (props.format !== null) {
    Object.assign(formatData, parseFileFormat(props.format))
  }
})
</script>

<template>
  <div class="config-panel">
    <section class="setting-card">
      <div class="setting-header">
        <div>
          <h4>文件类型限制</h4>
          <p>通过文件名后缀限制可提交的文件类型，不区分大小写。</p>
        </div>
        <el-switch
          active-text="限制"
          inactive-text="不限"
          :model-value="formatData.status"
          style="--el-switch-on-color: #13ce66; --el-switch-off-color: #dcdfe6"
          @change="v => handleChange(Boolean(v))"
        />
      </div>
      <div v-show="formatData.status" class="type-editor">
        <el-input v-model="typeName" placeholder="例如：txt,png,jpeg,webp">
          <template #append>
            <el-button @click="handleAddType">
              添加
            </el-button>
          </template>
        </el-input>
        <div class="tag-list">
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
          <span v-if="!formatData.format.length" class="empty-text">暂未添加文件类型</span>
        </div>
        <el-button
          v-show="formatData.format.length"
          type="primary"
          text
          size="small"
          @click="handleCopyType"
        >
          复制类型列表
        </el-button>
      </div>
    </section>

    <section class="setting-card">
      <div class="setting-header">
        <div>
          <h4>提交数量</h4>
          <p>限制单次最多可以上传的文件数量，范围 1-16。</p>
        </div>
        <el-input-number
          :model-value="formatData.limit"
          :min="1"
          :max="16"
          @change="handleChangeLimit"
        />
      </div>
    </section>

    <section class="setting-card">
      <div class="setting-header">
        <div>
          <h4>文件大小</h4>
          <p>设置单个文件大小上限，填 0 表示不限制。</p>
        </div>
        <div class="size-editor">
          <el-input-number
            :model-value="inputSize"
            :min="0"
            :max="1024"
            @change="handleLimitSize"
          />
          <el-select
            v-model="formatData.sizeUnit"
            placeholder="单位"
            @change="handleChangeUnit"
          >
            <el-option v-for="v in unitList" :key="v" :label="v" :value="v" />
          </el-select>
        </div>
      </div>
      <div class="result-tip" :class="{ danger: formatData.size !== 0 }">
        {{
          formatData.size === 0
            ? '当前不限制文件大小'
            : `当前限制为不超过 ${formatSize(formatData.size)}`
        }}
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.config-panel {
  display: grid;
  gap: 16px;
}

.setting-card {
  padding: 18px;
  background-color: #fff;
  border: 1px solid #edf2f7;
  border-radius: 14px;
}

.setting-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  h4 {
    margin: 0;
    font-size: 16px;
    color: #1f2d3d;
  }

  p {
    margin: 8px 0 0;
    font-size: 13px;
    color: #909399;
    line-height: 1.6;
  }
}

.type-editor {
  display: grid;
  gap: 12px;
  max-width: 520px;
  margin-top: 18px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 32px;
}

.type {
  margin: 0;
}

.empty-text {
  font-size: 13px;
  color: #c0c4cc;
}

.size-editor {
  display: flex;
  gap: 10px;

  .el-select {
    width: 100px;
  }
}

.result-tip {
  margin-top: 16px;
  padding: 10px 12px;
  color: #606266;
  background-color: #f5f7fa;
  border-radius: 10px;

  &.danger {
    color: #f56c6c;
    background-color: #fef0f0;
  }
}

@media screen and (max-width: 700px) {
  .setting-header,
  .size-editor {
    align-items: stretch;
    flex-direction: column;
  }

  .size-editor .el-select {
    width: 100%;
  }
}
</style>
