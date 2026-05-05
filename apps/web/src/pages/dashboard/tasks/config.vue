<script lang="ts" setup>
import { ElMessage } from 'element-plus'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TaskApi } from '@/apis'
import DDlPanel from './components/infoPanel/ddl.vue'
import FileInfoPanel from './components/infoPanel/file.vue'
import InfoPanel from './components/infoPanel/info.vue'
import PeoplePanel from './components/infoPanel/people.vue'
import TemplatePanel from './components/infoPanel/template.vue'
import TipInfoPanel from './components/infoPanel/tipInfo.vue'

const $route = useRoute()
const $router = useRouter()

const configSections = [
  {
    name: 'info',
    title: '必填信息',
    description: '配置提交文件时需要填写的表单字段和自动重命名规则。',
  },
  {
    name: 'ddl',
    title: '截止日期',
    description: '设置任务可提交的截止时间。',
  },
  {
    name: 'tip',
    title: '批注信息',
    description: '维护提交页展示的说明、提示和图片批注。',
  },
  {
    name: 'people',
    title: '限制名单',
    description: '限制可提交人员，并支持绑定表单字段校验。',
  },
  {
    name: 'template',
    title: '模板文件',
    description: '为当前任务配置可下载的模板文件。',
  },
  {
    name: 'attr',
    title: '文件属性',
    description: '限制文件类型、数量和单文件大小。',
  },
]

const activeInfo = ref(configSections[0].name)
const activeConfig = computed(
  () => configSections.find(v => v.name === activeInfo.value) || configSections[0],
)
const loading = ref(false)
const taskKey = computed(() => String($route.params.key || ''))
const activeTask: TaskApiTypes.TaskItem = reactive({
  category: '',
  key: '',
  name: '',
  recentLog: [],
})
const taskInfo = reactive<TaskApiTypes.TaskInfo>({})

function resetTaskInfo() {
  Object.assign(taskInfo, {
    info: '[]',
    ddl: '',
    tip: '',
    format: '',
    bindField: '',
    people: undefined,
    rewrite: undefined,
    template: '',
  })
}

async function loadTaskConfig() {
  if (!taskKey.value)
    return

  loading.value = true
  activeTask.key = taskKey.value
  activeTask.name = String($route.query.name || '')
  resetTaskInfo()

  try {
    const [taskRes, infoRes] = await Promise.all([
      TaskApi.getList(),
      TaskApi.getTaskMoreInfo(taskKey.value),
    ])
    const task = taskRes.data.tasks.find(v => v.key === taskKey.value)
    Object.assign(activeTask, task || {
      category: '',
      key: taskKey.value,
      name: activeTask.name || taskKey.value,
      recentLog: [],
    })
    Object.assign(taskInfo, infoRes.data)
  }
  catch {
    ElMessage.error('任务配置加载失败')
  }
  finally {
    loading.value = false
  }
}

function openTaskPage() {
  window.open(`/task/${activeTask.key}`)
}

watch(taskKey, loadTaskConfig, { immediate: true })
</script>

<template>
  <div class="task-config-page">
    <section class="page-hero">
      <el-page-header @back="$router.push('/dashboard/tasks')">
        <template #content>
          <span class="page-title">任务配置</span>
        </template>
      </el-page-header>

      <div class="task-summary">
        <div>
          <p>当前任务</p>
          <h2>{{ activeTask.name || activeTask.key }}</h2>
        </div>
        <el-button type="primary" plain @click="openTaskPage">
          去查看效果
        </el-button>
      </div>
    </section>

    <section v-loading="loading" class="config-layout">
      <aside class="config-nav">
        <button
          v-for="section in configSections"
          :key="section.name"
          class="nav-item"
          :class="{ active: activeInfo === section.name }"
          type="button"
          @click="activeInfo = section.name"
        >
          <span class="nav-title">{{ section.title }}</span>
          <span class="nav-desc">{{ section.description }}</span>
        </button>
      </aside>

      <div class="mobile-nav">
        <button
          v-for="section in configSections"
          :key="section.name"
          class="mobile-nav-item"
          :class="{ active: activeInfo === section.name }"
          type="button"
          @click="activeInfo = section.name"
        >
          {{ section.title }}
        </button>
      </div>

      <main class="config-content">
        <header class="content-header">
          <div>
            <h3>{{ activeConfig.title }}</h3>
            <p>{{ activeConfig.description }}</p>
          </div>
          <el-button class="preview-btn" type="primary" text @click="openTaskPage">
            去查看效果
          </el-button>
        </header>

        <div class="content-body">
          <InfoPanel
            v-show="activeInfo === 'info'"
            :rewrite="taskInfo.rewrite"
            :info="taskInfo.info"
            :k="activeTask.key"
            :format="taskInfo.format"
            @update:format="taskInfo.format = $event"
            @update:info="taskInfo.info = $event"
            @update:rewrite="taskInfo.rewrite = $event"
          />
          <DDlPanel
            v-show="activeInfo === 'ddl'"
            :ddl="taskInfo.ddl"
            :k="activeTask.key"
          />
          <TipInfoPanel
            v-show="activeInfo === 'tip'"
            :rewrite="taskInfo.rewrite"
            :tip="taskInfo.tip"
            :k="activeTask.key"
          />
          <PeoplePanel
            v-show="activeInfo === 'people'"
            :name="activeTask.name"
            :value="taskInfo.people"
            :k="activeTask.key"
            :field="taskInfo.bindField"
            :info="taskInfo.info"
          />
          <TemplatePanel
            v-show="activeInfo === 'template'"
            :value="taskInfo.template"
            :k="activeTask.key"
          />
          <FileInfoPanel
            v-show="activeInfo === 'attr'"
            :format="taskInfo.format"
            :k="activeTask.key"
          />
        </div>
      </main>
    </section>
  </div>
</template>

<style scoped lang="scss">
.task-config-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 20px 16px 2em;
}

.page-title {
  font-weight: 600;
}

.page-hero {
  padding: 20px;
  background: linear-gradient(135deg, #ffffff 0%, #f5f9ff 100%);
  border: 1px solid #edf2f7;
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(31, 45, 61, 0.06);
}

.task-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 24px;

  p {
    margin: 0 0 8px;
    font-size: 13px;
    color: #909399;
  }

  h2 {
    margin: 0;
    font-size: 24px;
    line-height: 1.3;
    color: #1f2d3d;
  }
}

.config-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 16px;
  margin-top: 16px;
  align-items: start;
}

.config-nav {
  position: sticky;
  top: 16px;
  padding: 8px;
  background-color: #fff;
  border: 1px solid #edf2f7;
  border-radius: 16px;
  box-shadow: 0 10px 28px rgba(31, 45, 61, 0.05);
}

.nav-item {
  width: 100%;
  padding: 14px 16px;
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  & + & {
    margin-top: 4px;
  }

  &:hover,
  &.active {
    background-color: #ecf5ff;
  }

  &.active {
    box-shadow: inset 3px 0 0 #409eff;
  }
}

.nav-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.nav-desc {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: #909399;
}

.mobile-nav {
  display: none;
}

.config-content {
  min-width: 0;
  overflow: hidden;
  background-color: #fff;
  border: 1px solid #edf2f7;
  border-radius: 16px;
  box-shadow: 0 10px 28px rgba(31, 45, 61, 0.05);
}

.content-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid #edf2f7;

  h3 {
    margin: 0;
    font-size: 20px;
    color: #1f2d3d;
  }

  p {
    margin: 8px 0 0;
    font-size: 13px;
    line-height: 1.6;
    color: #909399;
  }
}

.content-body {
  padding: 24px;
}

@media screen and (max-width: 700px) {
  .task-config-page {
    padding: 12px 12px 2em;
  }

  .page-hero {
    padding: 16px;
    border-radius: 12px;
  }

  .task-summary {
    align-items: flex-start;
    flex-direction: column;
    margin-top: 18px;

    h2 {
      font-size: 20px;
    }
  }

  .config-layout {
    display: block;
  }

  .config-nav {
    display: none;
  }

  .mobile-nav {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    padding: 6px;
    overflow-x: scroll;
    background-color: #fff;
    border: 1px solid #edf2f7;
    border-radius: 12px;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .mobile-nav-item {
    flex: 0 0 auto;
    padding: 8px 12px;
    color: #606266;
    white-space: nowrap;
    background: transparent;
    border: 0;
    border-radius: 10px;

    &.active {
      color: #409eff;
      font-weight: 600;
      background-color: #ecf5ff;
    }
  }

  .config-content {
    border-radius: 12px;
  }

  .content-header {
    padding: 16px;

    h3 {
      font-size: 18px;
    }
  }

  .preview-btn {
    display: none;
  }

  .content-body {
    padding: 16px 12px;
  }
}
</style>
