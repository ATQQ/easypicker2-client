<script lang="ts" setup>
import LinkDialog from '@components/linkDialog.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { TaskApi } from '@/apis'
import FloatingContact from '@/components/FloatingContact/index.vue'
import { useIsMobile, useSiteConfig } from '@/composables'
import { copyRes } from '@/utils/stringUtil'
import CategoryPanel from './components/CategoryPanel.vue'
import CreateTask from './components/CreateTask.vue'
import DDlPanel from './components/infoPanel/ddl.vue'
import FileInfoPanel from './components/infoPanel/file.vue'
import InfoPanel from './components/infoPanel/info.vue'
import PeoplePanel from './components/infoPanel/people.vue'
import TemplatePanel from './components/infoPanel/template.vue'
import TipInfoPanel from './components/infoPanel/tipInfo.vue'
import TaskInfo from './components/TaskInfo.vue'

const $store = useStore()
const $router = useRouter()
const { value: siteConfig } = useSiteConfig('file-page')

const isMobile = useIsMobile()
// 分类相关
const categorys = computed(() => $store.state.category.categoryList)

// 任务相关
const selectCategory = ref('default')
const tasks = computed<TaskApiTypes.TaskItem[]>(
  () => $store.state.task.taskList,
)
const filterTasks = computed(() => {
  const t = tasks.value.filter(v => v.category === selectCategory.value)
  return t
})
const selectedCategoryConfig = computed<CateGoryApiTypes.CategoryItem | undefined>(
  () => categorys.value.find((c: CateGoryApiTypes.CategoryItem) => c.k === selectCategory.value),
)
const isCustomCategorySelected = computed(() => !!selectedCategoryConfig.value)

const MAX_RECENT_TASK_KEYS = 10
const recentTaskKeys = ref<string[]>([])
function dashboardRecentStorageId() {
  const token = localStorage.getItem('token') || ''
  return token ? token.slice(-24) : 'anon'
}
function persistDashboardRecent() {
  const id = dashboardRecentStorageId()
  localStorage.setItem(
    `ep2-dash-recent:${id}`,
    JSON.stringify({
      keys: recentTaskKeys.value,
      lastCategory: selectCategory.value,
    }),
  )
}
function touchRecentTask(taskKey: string) {
  if (!taskKey)
    return
  const next = [
    taskKey,
    ...recentTaskKeys.value.filter(k => k !== taskKey),
  ].slice(0, MAX_RECENT_TASK_KEYS)
  recentTaskKeys.value = next
  persistDashboardRecent()
}
function removeFromRecentTasks(taskKey: string) {
  recentTaskKeys.value = recentTaskKeys.value.filter(k => k !== taskKey)
  persistDashboardRecent()
}
/** 当前分类下任务：最近操作过的排在前面 */
const orderedFilterTasks = computed(() => {
  const list = filterTasks.value
  const order = recentTaskKeys.value
  const rank = (k: string) => {
    const i = order.indexOf(k)
    return i === -1 ? Number.MAX_SAFE_INTEGER : i
  }
  return [...list].sort((a, b) => rank(a.key) - rank(b.key))
})

// 删除任务
function deleteTask(k: string, isTrash = false) {
  if (!k)
    return
  ElMessageBox.confirm(
    '确认删除此任务吗?',
    isTrash ? '!!回收站的删除后无法再恢复' : '数据无价，请谨慎操作',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: isTrash ? 'error' : 'info',
    },
  )
    .then(() => {
      $store.dispatch('task/deleteTask', k).then(() => {
        removeFromRecentTasks(k)
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
function editBaseInfo(task: any) {
  touchRecentTask(task.key)
  taskBaseInfo.name = task.name
  taskBaseInfo.category = task.category
  taskBaseInfo.key = task.key
  showBaseInfoDialog.value = true
}
function handleSaveEditInfo() {
  showBaseInfoDialog.value = false
  if (!taskBaseInfo.name.trim()) {
    ElMessage.warning('不能为空')
    return
  }
  $store.dispatch('task/updateTask', {
    ...taskBaseInfo,
    listCategory: selectCategory.value,
  }).then(() => {
    ElMessage.success('更新成功')
  })
}

// 生成分享链接
const shareTaskLink = ref('')
const showLinkModal = ref(false)
const shareTaskName = ref('')
function shareTask(k: string) {
  touchRecentTask(k)
  shareTaskLink.value = 'default'
  const { origin } = window.location
  shareTaskLink.value = `${origin}/task/${k}`
  copyRes(shareTaskLink.value, '收集链接已自动复制到粘贴板')
  shareTaskName.value = tasks.value.find(v => v.key === k)?.name
  showLinkModal.value = true
}

// 附加属性编辑
const taskInfo = reactive<TaskApiTypes.TaskInfo>({})
const showTaskInfoPanel = ref(false)
const activeInfo = ref('info')
const activeTask: TaskApiTypes.TaskItem = reactive({
  category: '',
  key: '',
  name: '',
  recentLog: [],
})
function shouldOpenTaskConfigPage() {
  return true
}
function editMore(item: any) {
  touchRecentTask(item.key)
  if (shouldOpenTaskConfigPage()) {
    $router.push({
      name: 'task-config',
      params: {
        key: item.key,
      },
      query: {
        name: item.name,
      },
    })
    return
  }

  Object.assign(activeTask, item)
  TaskApi.getTaskMoreInfo(item.key).then((res) => {
    // 先初始化,再赋值
    taskInfo.info = '[]'
    taskInfo.ddl = ''
    taskInfo.tip = ''
    taskInfo.format = ''
    taskInfo.bindField = ''
    setTimeout(() => {
      Object.assign(taskInfo, res.data)
      showTaskInfoPanel.value = true
    })
  })
}

function openCategoryConfig() {
  if (!selectedCategoryConfig.value)
    return
  $router.push({
    name: 'category-config',
    params: {
      key: selectedCategoryConfig.value.k,
    },
    query: {
      name: selectedCategoryConfig.value.name,
    },
  })
}

function loadTasksBySelectedCategory() {
  return $store.dispatch('task/getTaskByCategory', {
    category: selectCategory.value,
  })
}

function isAllowedCategory(category: string) {
  return [
    'default',
    'trash',
    ...categorys.value.map((c: { k: string }) => c.k),
  ].includes(category)
}

let tasksPageReady = false
let readyRefreshTasksPage = false
async function refreshTasksPageData() {
  tasksPageReady = false
  await $store.dispatch('category/getCategory')
  if (!isAllowedCategory(selectCategory.value)) {
    selectCategory.value = 'default'
  }
  await loadTasksBySelectedCategory()
  tasksPageReady = true
}

function handleBlur() {
  readyRefreshTasksPage = true
}

function handleFocus() {
  if (!readyRefreshTasksPage)
    return
  readyRefreshTasksPage = false
  void refreshTasksPageData()
}

// TODO: 有需要再优化，目前像bug
// 用于选择默认展示项目
// const taskCount = (c: string) => {
//   const count = tasks.value.filter((t: any) => t.category === c).length
//   return count
// }

// 选中一个有任务数据的分类
// watchEffect(() => {
//   if (taskCount('default') > 0) {
//     return
//   }
//   if (categorys.value.length > 0) {
//     for (const c of categorys.value) {
//       if (taskCount(c.k) > 0) {
//         selectCategory.value = c.k
//         break
//       }
//     }
//   }
// })

async function initTasksPage() {
  tasksPageReady = false
  await $store.dispatch('category/getCategory')
  const raw = localStorage.getItem(
    `ep2-dash-recent:${dashboardRecentStorageId()}`,
  )
  if (raw) {
    try {
      const s = JSON.parse(raw) as {
        keys?: string[]
        lastCategory?: string
      }
      if (Array.isArray(s.keys))
        recentTaskKeys.value = s.keys.slice(0, MAX_RECENT_TASK_KEYS)
      if (s.lastCategory && isAllowedCategory(s.lastCategory))
        selectCategory.value = s.lastCategory
    }
    catch {
      /* ignore */
    }
  }
  await loadTasksBySelectedCategory()
  tasksPageReady = true
}

watch(selectCategory, () => {
  if (!tasksPageReady)
    return
  persistDashboardRecent()
  loadTasksBySelectedCategory()
})

onMounted(() => {
  initTasksPage()
  window.addEventListener('blur', handleBlur)
  window.addEventListener('focus', handleFocus)
})

onUnmounted(() => {
  window.removeEventListener('blur', handleBlur)
  window.removeEventListener('focus', handleFocus)
})

function openTaskPage() {
  window.open(`/task/${activeTask.key}`)
}
</script>

<template>
  <div class="tasks">
    <!-- 分类管理 -->
    <div class="categorys-area">
      <CategoryPanel v-model:category="selectCategory" />
    </div>

    <!-- 任务管理 -->
    <div class="panel task-panel">
      <!-- 创建任务 -->
      <CreateTask :active-category-key="selectCategory" />
      <el-button
        v-if="isCustomCategorySelected"
        class="category-config-btn"
        type="primary"
        plain
        size="small"
        @click="openCategoryConfig"
      >
        分类配置
      </el-button>

      <!-- 任务列表 -->
      <div class="task-list">
        <TaskInfo
          v-for="item in orderedFilterTasks"
          :key="item.key"
          :item="item"
          @edit="editBaseInfo"
          @delete="deleteTask"
          @share="shareTask"
          @more="editMore"
        />
        <el-empty
          v-if="orderedFilterTasks.length === 0"
          description="此分类下没有任务哟，快去创建吧"
        />
      </div>
    </div>

    <!-- 任务基本信息维护弹窗 -->
    <el-dialog
      v-model="showBaseInfoDialog"
      draggable
      :fullscreen="isMobile"
      title="基本信息修改"
    >
      <el-form :model="taskBaseInfo">
        <el-form-item label="任务名称" label-width="100px">
          <el-input v-model="taskBaseInfo.name" autocomplete="off" />
        </el-form-item>
        <el-form-item label="新的分类" label-width="100px">
          <el-select v-model="taskBaseInfo.category" placeholder="请选择新分类">
            <el-option label="默认" value="default" />
            <el-option
              v-for="c in categorys"
              :key="c.k"
              :label="c.name"
              :value="c.k"
            />
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
    <LinkDialog
      v-model:value="showLinkModal"
      :download="false"
      title="收取链接"
      :link="shareTaskLink"
      :share-text-prefix="shareTaskName"
    />
    <FloatingContact
      v-if="siteConfig.filePageFloatingContactEnabled && siteConfig.filePageContactLink"
      :href="siteConfig.filePageContactLink"
      :text="siteConfig.filePageContactLinkText || '联系客服'"
    />
    <!-- 附加属性编辑弹窗 -->
    <el-dialog
      v-model="showTaskInfoPanel"
      :fullscreen="isMobile"
      title="更多设置"
      center
    >
      <div>
        <h3 class="tc" style="font-size: 14px; color: #9e9e9e">
          任务名：<strong style="color: #000000">{{ activeTask.name }}</strong>，
          <el-button type="primary" text @click="openTaskPage">
            去查看效果
          </el-button>
        </h3>
        <el-tabs v-model="activeInfo">
          <el-tab-pane label="截止日期" name="ddl">
            <DDlPanel :ddl="taskInfo.ddl" :k="activeTask.key" />
          </el-tab-pane>
          <el-tab-pane label="批注信息" name="tip">
            <TipInfoPanel
              :rewrite="taskInfo.rewrite"
              :tip="taskInfo.tip"
              :k="activeTask.key"
            />
          </el-tab-pane>
          <el-tab-pane label="限制名单" name="people">
            <PeoplePanel
              :name="activeTask.name"
              :value="taskInfo.people"
              :k="activeTask.key"
              :field="taskInfo.bindField"
              :info="taskInfo.info"
            />
          </el-tab-pane>
          <el-tab-pane label="必填信息" name="info">
            <InfoPanel
              :rewrite="taskInfo.rewrite"
              :info="taskInfo.info"
              :k="activeTask.key"
              :format="taskInfo.format"
            />
          </el-tab-pane>
          <el-tab-pane label="模板文件" name="template">
            <TemplatePanel :value="taskInfo.template" :k="activeTask.key" />
          </el-tab-pane>
          <el-tab-pane label="文件属性" name="attr">
            <FileInfoPanel :format="taskInfo.format" :k="activeTask.key" />
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.tasks {
  max-width: 1024px;
  margin: 0 auto;
  padding-bottom: 2em;
}

.tasks :deep(.el-dialog__body) {
  padding-top: 10px;
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

.task-panel {
  position: relative;
}

.category-config-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1;
}

@media screen and (max-width: 700px) {
  .categorys-area {
    margin-top: 20px;
  }
  :deep(.el-tabs__nav-scroll) {
    overflow-x: scroll;
    &::-webkit-scrollbar {
      display: none; /* Chrome Safari */
    }
  }
}
</style>
