<template>
  <div class="tasks">
    <!-- 分类管理 -->
    <div class="panel">
      <!-- 按钮 -->
      <div class="btn-area">
        <h5>分类列表</h5>
        <h6 style="font-weight: lighter;">
          (点击分类可筛选任务)
        </h6>
      </div>
      <!-- 分类列表 -->
      <div style="margin-top: 15px" class="category-list">
        <el-tag :effect="selectCategory==='default'?'dark':'plain'" @click="handleClickCategory('default')">默认</el-tag>
        <el-tag
          v-for="tag in categorys"
          :key="tag.k"
          closable
          :effect="selectCategory===tag.k?'dark':'plain'"
          @close="handleDeleteCategory(tag)"
          @click="handleClickCategory(tag.k)"
        >{{ tag.name }}</el-tag>
        <el-input
          class="input-new-tag"
          v-if="isShowCreateCategory"
          v-model="categoryName"
          ref="saveTagInput"
          size="small"
          @keyup.enter="addCategory"
          @focusout="addCategory"
        ></el-input>
        <el-button
          v-else
          class="button-new-tag"
          size="small"
          @click="isShowCreateCategory = true"
        >+ New 分类</el-button>
      </div>
    </div>

    <!-- 创建任务 -->
    <div class="panel task-panel">
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
            <template #prepend>
              <el-select v-model="selectCategory" placeholder="请选择">
                <el-option label="默认" value="default"></el-option>
                <el-option v-for="c in categorys" :key="c.k" :label="c.name" :value="c.k"></el-option>
              </el-select>
            </template>
            <template #append>
              <el-button @click="createTask" type="primary">确定</el-button>
            </template>
          </el-input>
        </div>
      </div>

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
                <el-button @click="deleteTask(item.key)" circle type="danger" icon="el-icon-delete" size="small" title="删除"></el-button>
              </div>
            </div>
          </template>

          <!-- 没有提交记录 -->
          <div class="body">
            <div class="empty">暂时没有提交记录...</div>
          </div>
        </el-card>

        <el-empty v-if="filterTasks.length===0" description="此分类下没有任务哟"></el-empty>
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

export default defineComponent({
  setup() {
    const $store = useStore()
    // 分类相关
    const categorys = computed(() => $store.state.category.categoryList)
    const isShowCreateCategory = ref(false)
    const categoryName = ref('')
    const addCategory = () => {
      isShowCreateCategory.value = false
      if (!categoryName.value) {
        return
      }
      $store
        .dispatch('category/createCategory', categoryName.value)
        .then(() => {
          ElMessage.success('创建成功')
        })
      categoryName.value = ''
    }
    const handleDeleteCategory = (c: any) => {
      ElMessageBox.confirm('是否删除', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
        .then(() => {
          $store.dispatch('category/deleteCategory', c.k).then(() => {
            ElMessage.success('删除成功')
          })
        })
        .catch(() => {
          ElMessage.info('取消删除')
        })
    }

    // 任务相关
    const isShowCreateTask = ref(false)
    const selectCategory = ref('default')
    const taskName = ref('')
    const tasks = computed<any[]>(() => $store.state.task.taskList)
    const filterTasks = computed(() => {
      const t = tasks.value.filter((v) => v.category === selectCategory.value)
      return t
    })
    const handleClickCategory = (k:string) => {
      selectCategory.value = k
    }
    const createTask = () => {
      if (!taskName.value) {
        return
      }
      $store
        .dispatch('task/createTask', {
          name: taskName.value,
          category: selectCategory.value,
        })
        .then(() => {
          ElMessage.success('创建成功')
        })
      taskName.value = ''
    }
    const deleteTask = (k:string) => {
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
    const editBaseInfo = (task:any) => {
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
      isShowCreateCategory,
      categoryName,
      addCategory,
      isShowCreateTask,
      selectCategory,
      tasks,
      createTask,
      taskName,
      handleDeleteCategory,
      handleClickCategory,
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
.btn-area {
  display: flex;
  justify-content: center;
}
.task-panel {
  .input-container {
    margin: 15px auto;
    max-width: 600px;
    background-color: #fff;
    ::v-deep .el-select .el-input {
      width: 150px;
    }
  }
}

.task-list{
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
