<template>
  <div class="tasks">
    <!-- 分类管理 -->
    <CategoryPanel v-model:category="selectCategory"></CategoryPanel>

    <!-- 任务管理 -->
    <div class="panel task-panel">
      <!-- 创建任务 -->
      <create-task :activeCategoryKey="selectCategory"></create-task>

      <!-- 任务列表 -->
      <div class="task-list">
        <el-card v-for="item in filterTasks" :key="item.key" class="task-item">
          <template #header>
            <div class="header">
              <span>{{ item.name }}</span>
              <div class="actions">
                <el-button
                  circle
                  type="success"
                  icon="el-icon-edit-outline"
                  size="small"
                  title="编辑基本信息"
                  @click="editBaseInfo(item)"
                ></el-button>
                <el-button circle type="primary" icon="el-icon-share" size="small" title="分享"></el-button>
                <el-button
                  @click="deleteTask(item.key)"
                  circle
                  type="danger"
                  icon="el-icon-delete"
                  size="small"
                  title="删除"
                ></el-button>
              </div>
            </div>
          </template>

          <!-- 没有提交记录 -->
          <div class="body">
            <div class="empty">暂时没有提交记录...</div>
          </div>
        </el-card>

        <el-empty v-if="filterTasks.length === 0" description="此分类下没有任务哟"></el-empty>
      </div>
    </div>
    <!-- 任务基本信息维护弹窗 -->
    <el-dialog title="基本信息修改" v-model="showBaseInfoDialog">
      <el-form :model="taskBaseInfo">
        <el-form-item label="活动名称" label-width="100px">
          <el-input v-model="taskBaseInfo.name" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="新的分类" label-width="100px">
          <el-select v-model="taskBaseInfo.category" placeholder="请选择新分类">
            <el-option label="默认" value="default"></el-option>
            <el-option v-for="c in categorys" :key="c.k" :label="c.name" :value="c.k"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showBaseInfoDialog = false">取 消</el-button>
          <el-button type="primary" @click="handleSaveEditInfo">确 定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>
<script lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  computed, defineComponent, onMounted, reactive, ref,
} from 'vue'
import { useStore } from 'vuex'
import CategoryPanel from './components/CategoryPanel.vue'
import CreateTask from './components/CreateTask.vue'

export default defineComponent({
  components: {
    CategoryPanel,
    CreateTask,
  },
  setup() {
    const $store = useStore()
    // 分类相关
    const categorys = computed(() => $store.state.category.categoryList)

    // 任务相关
    const selectCategory = ref('default')
    const tasks = computed<any[]>(() => $store.state.task.taskList)
    const filterTasks = computed(() => {
      const t = tasks.value.filter((v) => v.category === selectCategory.value)
      return t
    })

    const deleteTask = (k: string) => {
      if (!k) return
      ElMessageBox.confirm('确认删除此任务吗?', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
        .then(() => {
          $store.dispatch('task/deleteTask', k).then(() => {
            ElMessage.success('删除成功')
          })
        })
        .catch(() => {
          ElMessage.info('取消删除')
        })
    }
    const showBaseInfoDialog = ref(false)
    const taskBaseInfo = reactive({ name: '', category: '', key: '' })
    const editBaseInfo = (task: any) => {
      taskBaseInfo.name = task.name
      taskBaseInfo.category = task.category
      taskBaseInfo.key = task.key
      showBaseInfoDialog.value = true
    }
    const handleSaveEditInfo = () => {
      showBaseInfoDialog.value = false
      $store.dispatch('task/updateTask', taskBaseInfo).then(() => {
        ElMessage.success('更新成功')
      })
    }
    onMounted(() => {
      $store.dispatch('category/getCategory')
      $store.dispatch('task/getTask')
    })
    return {
      categorys,
      selectCategory,
      tasks,
      deleteTask,
      filterTasks,
      showBaseInfoDialog,
      taskBaseInfo,
      editBaseInfo,
      handleSaveEditInfo,
    }
  },
})
</script>
<style scoped lang="scss">
.tasks {
  max-width: 1024px;
  margin: 0 auto;
  padding-bottom: 2em;
}

.el-tag + .el-tag {
  margin-left: 10px;
  margin-bottom: 10px;
}
.el-tag {
  cursor: pointer;
}

.button-new-tag {
  margin-left: 10px;
  height: 32px;
  line-height: 30px;
  padding-top: 0;
  padding-bottom: 0;
}
.input-new-tag {
  width: 90px;
  margin-left: 10px;
  margin-bottom: 10px;
  vertical-align: bottom;
}
.panel {
  padding: 1em;
  background-color: #fff;
  margin: 10px auto;
  box-sizing: border-box;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.task-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
}
.task-list .task-item {
  min-width: 400px;
  margin-top: 1em;
  .header {
    overflow: hidden;
    .actions {
      float: right;
      padding: 3px 0;
    }
  }

  .body {
    height: 60px;
    .empty {
      text-align: center;
      font-size: 12px;
      color: grey;
    }
  }
}
</style>
