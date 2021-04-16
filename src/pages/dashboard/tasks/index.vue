<template>
  <div class="tasks">
    <!-- 分类管理 -->
    <el-affix :offset="0">
      <CategoryPanel v-model:category="selectCategory"></CategoryPanel>
    </el-affix>

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
          @more="editMore"
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
    <LinkDialog v-model:value="showLinkModal" :download="false" title="收取链接" :link="shareTaskLink">
    </LinkDialog>
    <!-- 附加属性编辑弹窗 -->
    <el-dialog title="更多设置" v-model="showTaskInfoPanel" center>
      <div>
        <el-tabs v-model="activeInfo">
          <el-tab-pane label="截止日期" name="ddl">
            <DDlPanel :ddl="taskInfo.ddl" :k="activeTask.key"></DDlPanel>
          </el-tab-pane>
          <el-tab-pane label="模板文件" name="template">
            <TemplatePanel :value="taskInfo.template" :k="activeTask.key"></TemplatePanel>
          </el-tab-pane>
          <el-tab-pane label="限制人员" name="people">
            <PeoplePanel :value="taskInfo.people" :k="activeTask.key"></PeoplePanel>
          </el-tab-pane>
          <el-tab-pane label="必填信息" name="info">
            <InfoPanel :rewrite="taskInfo.rewrite" :info="taskInfo.info" :k="activeTask.key"></InfoPanel>
          </el-tab-pane>
        </el-tabs>
      </div>
      <!-- <template #footer>
        <span class="dialog-footer">
          <el-button type="primary" @click="showTaskInfoPanel = false">关闭</el-button>
        </span>
      </template>-->
    </el-dialog>
  </div>
</template>
<script lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  computed, defineComponent, onMounted, reactive, ref,
} from 'vue'
import { useStore } from 'vuex'
import { copyRes, getShortUrl } from '@/utils/stringUtil'
import { TaskApi } from '@/apis'
import LinkDialog from '@components/linkDialog.vue'
import CategoryPanel from './components/CategoryPanel.vue'
import CreateTask from './components/CreateTask.vue'
import TaskInfo from './components/TaskInfo.vue'
import DDlPanel from './components/infoPanel/ddl.vue'
import PeoplePanel from './components/infoPanel/people.vue'
import TemplatePanel from './components/infoPanel/template.vue'
import InfoPanel from './components/infoPanel/info.vue'

export default defineComponent({
  components: {
    LinkDialog,
    CategoryPanel,
    CreateTask,
    TaskInfo,
    DDlPanel,
    PeoplePanel,
    TemplatePanel,
    InfoPanel,
  },
  setup(_, context) {
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
      if (!taskBaseInfo.name.trim()) {
        ElMessage.warning('不能为空')
        return
      }
      $store.dispatch('task/updateTask', taskBaseInfo).then(() => {
        ElMessage.success('更新成功')
      })
    }

    // 生成分享链接
    const shareTaskLink = ref('')
    const showLinkModal = ref(false)
    const shareTask = (k: string) => {
      shareTaskLink.value = 'default'
      const { origin } = window.location
      shareTaskLink.value = `${origin}/task/${k}`
      showLinkModal.value = true
    }

    // 附加属性编辑
    const taskInfo = reactive<TaskInfo>({})
    const showTaskInfoPanel = ref(false)
    const activeInfo = ref('info')
    const activeTask: any = reactive({})

    const editMore = (item: any) => {
      Object.assign(activeTask, item)
      TaskApi.getTaskMoreInfo(item.key).then((res) => {
        // todo:先初始化,再赋值
        Object.assign(taskInfo, res.data)
        showTaskInfoPanel.value = true
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
      shareTask,
      shareTaskLink,
      showLinkModal,
      taskInfo,
      activeInfo,
      editMore,
      showTaskInfoPanel,
      activeTask,
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

.qr-code {
  margin-top: 10px;
  text-align: center;
}
</style>
