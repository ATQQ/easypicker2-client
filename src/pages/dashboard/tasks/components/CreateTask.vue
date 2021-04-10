<template>
    <div>
        <div class="btn-area">
            <el-button
                size="small"
                type="primary"
                :plain="!isShowCreateTask"
                @click="isShowCreateTask = !isShowCreateTask"
            >{{ isShowCreateTask ? "关闭新增面板" : "创建任务" }}</el-button>
        </div>
        <!-- 新增区域 -->
        <div v-show="isShowCreateTask">
            <div class="input-container">
                <el-input placeholder="请输入任务名称(左侧选择分类)" v-model="taskName">
                    <template #prepend>{{ categoryName }}</template>
                    <template #append>
                        <el-button @click="createTask" type="primary">确定</el-button>
                    </template>
                </el-input>
            </div>
        </div>
    </div>
</template>
<script lang="ts">
import { ElMessage } from 'element-plus'
import { computed, defineComponent, ref } from 'vue'
import { useStore } from 'vuex'

export default defineComponent({
  name: 'createTask',
  props: {
    activeCategoryKey: {
      type: String,
      default: 'default',
    },
  },
  setup(props) {
    const $store = useStore()
    const categorys = computed(() => $store.state.category.categoryList)
    const categoryName = computed(() => {
      if (props.activeCategoryKey === 'default') {
        return '默认'
      }
      return categorys.value.find((v: any) => v.k === props.activeCategoryKey).name
    })
    // 任务相关
    const isShowCreateTask = ref(false)
    const taskName = ref('')
    const createTask = () => {
      if (!taskName.value) {
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
    return {
      isShowCreateTask,
      taskName,
      createTask,
      categoryName,
    }
  },
})
</script>
<style scoped>
.btn-area {
    display: flex;
    justify-content: center;
}
.input-container {
    margin: 15px auto;
    max-width: 600px;
    background-color: #fff;
}
</style>
