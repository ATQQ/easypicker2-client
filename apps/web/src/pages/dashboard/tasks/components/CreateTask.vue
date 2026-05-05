<script lang="ts" setup>
import { Menu } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { ref } from 'vue'
import { useStore } from 'vuex'
import Tip from './infoPanel/tip.vue'

const props = defineProps({
  activeCategoryKey: {
    type: String,
    default: 'default',
  },
})
const $store = useStore()
// 任务相关
const isShowCreateTask = ref(false)
const taskName = ref('')
function createTask() {
  if (!taskName.value.trim()) {
    ElMessage.warning('不能为空')
    return
  }
  $store
    .dispatch('task/createTask', {
      name: taskName.value,
      category: props.activeCategoryKey,
    })
    .then(() => {
      ElMessage.success('创建成功')
    })
  taskName.value = ''
}
</script>

<template>
  <div>
    <div class="btn-area">
      <el-button
        size="large" type="primary" :plain="!isShowCreateTask" @click="
          isShowCreateTask
            = !isShowCreateTask
        "
      >
        {{
          isShowCreateTask
            ? '关闭创建面板'
            : '创建收集任务'
        }}
      </el-button>
    </div>
    <!-- 新增区域 -->
    <div v-show="isShowCreateTask">
      <div class="input-container">
        <el-input v-model="taskName" placeholder="请输入任务名称(上述列表选择分类)" />
        <el-button :type="taskName?.length ? 'success' : 'default'" @click="createTask">
          确定
        </el-button>
      </div>
    </div>
    <Tip class="p10">
      点击
      <el-icon>
        <Menu />
      </el-icon> 可以进一步的调整任务
    </Tip>
    <Tip>
      设置截止时间，自动重命名，名单限制，批注，文件模板。。🚀
    </Tip>
  </div>
</template>

<style scoped>
.btn-area {
  display: flex;
  justify-content: center;
}

.input-container {
  margin: 15px auto;
  max-width: 600px;
  background-color: #fff;
  display: flex;
  justify-content: space-around;
}
</style>
