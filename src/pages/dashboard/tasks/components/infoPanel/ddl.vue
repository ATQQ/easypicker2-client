<template>
    <div class="tc">
        <el-date-picker
          :editable="false"
          v-model="newDate"
          type="datetime"
          placeholder="点击设置新截止日期"
          @blur="updateDDL"
          :default-time="new Date(ddl)"
        ></el-date-picker>
        <el-button @click="closeDDL">关闭</el-button>
      </div>
</template>
<script lang="ts">
import { defineComponent, ref, watch } from 'vue'
import { updateTaskInfo } from '../../public'

export default defineComponent({
  name: 'ddlPanel',
  props: {
    ddl: {
      type: String,
      default: '',
    },
    k: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    const newDate = ref()
    watch(() => props.ddl, (newVal) => {
      if (newVal) {
        newDate.value = new Date(newVal)
      } else {
        newDate.value = null
      }
    })
    // 更新DDL
    const updateDDL = () => {
      if (newDate.value) {
        updateTaskInfo(props.k, { ddl: newDate.value })
      }
    }
    // 关闭DDL
    const closeDDL = () => {
      newDate.value = null
      updateTaskInfo(props.k, { ddl: null })
    }

    return {
      newDate,
      updateDDL,
      closeDDL,
    }
  },
})
</script>
<style scoped>

</style>
