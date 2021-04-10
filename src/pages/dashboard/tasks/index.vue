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
        <task-info
          @edit="editBaseInfo"
          @delete="deleteTask"
          @share="shareTask"
          v-for="item in filterTasks"
          :key="item.key"
          :item="item"
        ></task-info>
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

    <!-- 分享链接弹窗(二维码/链接/短链) -->
    <el-dialog title="收取链接" v-model="showLinkModal" center>
      <!-- 链接 -->
      <div>
        <el-input disabled placeholder="生成的链接" v-model="shareTaskLink">
          <template #prepend>
            <el-button type="primary" @click="createShortLink">
              生成短链
            </el-button>
          </template>
          <template #append>
            <el-button type="primary" @click="copyLink">
              复制
            </el-button>
          </template>
        </el-input>
      </div>
      <!-- 二维码 -->
      <div class="qr-code">
        <qr-code :value="shareTaskLink"></qr-code>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button type="primary" @click="showLinkModal = false">关闭</el-button>
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
import QrCode from '@components/QrCode.vue'
import { copyRes, getShortUrl } from '@/utils/stringUtil'
import CategoryPanel from './components/CategoryPanel.vue'
import CreateTask from './components/CreateTask.vue'
import TaskInfo from './components/TaskInfo.vue'

export default defineComponent({
  components: {
    CategoryPanel,
    CreateTask,
    TaskInfo,
    QrCode,
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

    // 删除任务
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

    // 基本信息编辑
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

    // 生成分享链接
    const shareTaskLink = ref('')
    const showLinkModal = ref(false)
    const shareTask = (k:string) => {
      shareTaskLink.value = 'default'
      const { origin } = window.location
      shareTaskLink.value = `${origin}/task/${k}`
      showLinkModal.value = true
    }
    const createShortLink = () => {
      getShortUrl(shareTaskLink.value).then((v) => {
        shareTaskLink.value = v
        ElMessage.success('短链生成成功')
      })
    }
    const copyLink = () => {
      copyRes(shareTaskLink.value)
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
      shareTask,
      shareTaskLink,
      showLinkModal,
      createShortLink,
      copyLink,
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

.qr-code{
  margin-top: 10px;
  text-align: center;
}
</style>
