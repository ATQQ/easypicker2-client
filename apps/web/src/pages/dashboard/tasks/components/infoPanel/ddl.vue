<script lang="ts" setup>
import { computed, onMounted, ref, watchEffect } from 'vue'
import { formatDate } from '@/utils/stringUtil'
import { updateTaskInfo } from '../../public'
import Tip from './tip.vue'

const props = defineProps({
  ddl: {
    type: String,
    default: '',
    required: false,
  },
  k: {
    type: String,
    default: '',
  },
})

function parseDdlDate(ddl: string): Date | null {
  if (!ddl || typeof ddl !== 'string')
    return null
  const d = new Date(ddl)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Element Plus datetime 的 default-time 不能传 Invalid Date，否则面板会整页 NaN */
const FALLBACK_DEFAULT_TIME = new Date(2000, 0, 1, 23, 59, 59)

const newDate = ref<Date | null>()
watchEffect(() => {
  newDate.value = parseDdlDate(props.ddl)
})

const pickerDefaultTime = computed(() => parseDdlDate(props.ddl) ?? FALLBACK_DEFAULT_TIME)
// 更新DDL
function updateDDL() {
  if (newDate.value) {
    const ddl = formatDate(
      new Date(newDate.value.getTime() - 1000 * 60 * 60 * 8),
    )
    updateTaskInfo(props.k, { ddl })
  }
}
// 关闭DDL
function closeDDL() {
  newDate.value = null
  updateTaskInfo(props.k, { ddl: null })
}

const waitTime = ref(0)
const isOver = computed(() => waitTime.value <= 0)
const waitTimeStr = computed(() => {
  let seconds = ~~(waitTime.value / 1000)
  let hour = ~~(seconds / (60 * 60))
  const day = ~~(hour / 24)
  hour %= 24
  const minute = ~~((seconds % 3600) / 60)
  seconds %= 60
  return `剩余${day}天${hour}时${minute}分${seconds}秒`
})

function refreshWaitTime(loop = true) {
  if (newDate.value) {
    waitTime.value = newDate.value.getTime() - Date.now()
  }
  else {
    waitTime.value = 0
  }
  if (loop) {
    setTimeout(() => {
      refreshWaitTime()
    }, 1000)
  }
}

onMounted(() => {
  refreshWaitTime()
})
</script>

<template>
  <div class="config-panel ddl-panel">
    <div class="panel-tip">
      <div>
        <h4>提交截止时间</h4>
        <p>设置后，超过截止时间用户将不能继续提交文件。</p>
      </div>
      <Tip
        :imgs="[
          'https://img.cdn.sugarat.top/mdImg/MTY0OTE0OTI4NjU5Nw==649149286597',
          'https://img.cdn.sugarat.top/mdImg/MTY0OTE0OTMxMDEyOQ==649149310129',
          'https://img.cdn.sugarat.top/mdImg/MTY0OTE0OTM3MzgxOA==649149373818',
        ]"
      >
        查看示例
      </Tip>
    </div>

    <div class="setting-card">
      <div class="setting-main">
        <div>
          <h5>截止日期</h5>
          <p>选择具体日期和时间后会自动保存。</p>
        </div>
        <el-date-picker
          v-model="newDate"
          :editable="false"
          type="datetime"
          placeholder="点击设置新截止日期"
          :default-time="pickerDefaultTime"
          @change="updateDDL"
        />
      </div>
      <div class="setting-footer">
        <el-tag v-if="newDate" :type="isOver ? 'danger' : 'success'" effect="light">
          {{ isOver ? '已经截止' : waitTimeStr }}
        </el-tag>
        <span v-else class="muted">暂未设置截止时间</span>
        <el-button v-if="newDate" type="danger" plain @click="closeDDL">
          取消截止时间
        </el-button>
      </div>
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
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
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

.setting-main,
.setting-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.setting-main {
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
}

.muted {
  color: #909399;
}

@media screen and (max-width: 700px) {
  .panel-tip,
  .setting-main,
  .setting-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .ddl-panel :deep(.el-date-editor) {
    width: 100%;
  }
}
</style>
