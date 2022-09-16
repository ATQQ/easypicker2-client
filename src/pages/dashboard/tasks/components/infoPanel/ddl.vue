<template>
  <div class="tc ddl">
    <tip
      :imgs="[
        'https://img.cdn.sugarat.top/mdImg/MTY0OTE0OTI4NjU5Nw==649149286597',
        'https://img.cdn.sugarat.top/mdImg/MTY0OTE0OTMxMDEyOQ==649149310129',
        'https://img.cdn.sugarat.top/mdImg/MTY0OTE0OTM3MzgxOA==649149373818'
      ]"
      >设置截止日期，截止后将不能再提交文件。</tip
    >
    <div class="tc flex fc fac">
      <el-date-picker
        :editable="false"
        v-model="newDate"
        type="datetime"
        placeholder="点击设置新截止日期"
        @change="updateDDL"
        :default-time="new Date(ddl)"
      ></el-date-picker>
      <el-button v-if="newDate" @click="closeDDL">取消</el-button>
    </div>
    <div style="margin-top: 10px" v-if="newDate">
      <tip>{{ isOver ? '已经截止' : `剩余时间: ${waitTimeStr}` }} </tip>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, onMounted, ref, watchEffect } from 'vue'
import { formatDate } from '@/utils/stringUtil'
import { updateTaskInfo } from '../../public'
import Tip from './tip.vue'

const props = defineProps({
  ddl: {
    type: String,
    default: '',
    required: false
  },
  k: {
    type: String,
    default: ''
  }
})

const newDate = ref()
watchEffect(() => {
  if (props.ddl) {
    newDate.value = new Date(props.ddl)
  } else {
    newDate.value = null
  }
})
// 更新DDL
const updateDDL = () => {
  if (newDate.value) {
    const ddl = formatDate(
      new Date(newDate.value.getTime() - 1000 * 60 * 60 * 8)
    )
    updateTaskInfo(props.k, { ddl })
  }
}
// 关闭DDL
const closeDDL = () => {
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

const refreshWaitTime = (loop = true) => {
  if (newDate.value) {
    waitTime.value = newDate.value.getTime() - Date.now()
  } else {
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
