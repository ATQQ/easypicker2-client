<script lang="ts" setup>
import { ElMessage } from 'element-plus'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CategoryApi, TaskApi } from '@/apis'

const $route = useRoute()
const $router = useRouter()

const loading = ref(false)
const saving = ref(false)
const category = ref<CateGoryApiTypes.CategoryItem>()
const tasks = ref<TaskApiTypes.TaskItem[]>([])
const submitNavKeys = ref<string[]>([])
const categoryKey = computed(() => String($route.params.key || ''))
const categoryName = computed(() => category.value?.name || String($route.query.name || ''))
const tasksInCategory = computed(() =>
  tasks.value.filter(t => t.category === categoryKey.value),
)

async function loadCategoryConfig() {
  if (!categoryKey.value)
    return

  loading.value = true
  try {
    const [categoryRes, taskRes] = await Promise.all([
      CategoryApi.getList(),
      TaskApi.getList(),
    ])
    const current = categoryRes.data.categories.find(c => c.k === categoryKey.value)
    if (!current) {
      ElMessage.error('分类不存在')
      $router.replace('/dashboard/tasks')
      return
    }
    category.value = current
    tasks.value = taskRes.data.tasks
    submitNavKeys.value = Array.isArray(current.submitNavKeys)
      ? current.submitNavKeys.filter(key =>
          taskRes.data.tasks.some(t => t.key === key && t.category === categoryKey.value),
        )
      : []
  }
  catch {
    ElMessage.error('分类配置加载失败')
  }
  finally {
    loading.value = false
  }
}

async function saveSubmitNav() {
  if (!categoryKey.value)
    return

  saving.value = true
  try {
    await CategoryApi.updateSubmitNav(categoryKey.value, submitNavKeys.value)
    ElMessage.success('已保存分类配置')
    await loadCategoryConfig()
  }
  catch {
    ElMessage.error('分类配置保存失败')
  }
  finally {
    saving.value = false
  }
}

function backToTasks() {
  $router.push('/dashboard/tasks')
}

watch(categoryKey, loadCategoryConfig, { immediate: true })
</script>

<template>
  <div class="category-config-page">
    <section class="page-header">
      <el-page-header @back="backToTasks">
        <template #content>
          <span class="page-title">分类配置</span>
        </template>
      </el-page-header>
      <div class="category-summary">
        <div>
          <p>当前分类</p>
          <h2>{{ categoryName || categoryKey }}</h2>
        </div>
      </div>
    </section>

    <section v-loading="loading" class="config-panel">
      <header class="config-title">
        <div>
          <h3>提交页快捷切换</h3>
          <p>公开任务页展示同分类下可选任务，便于投稿人在多个收集项间切换。</p>
        </div>
        <el-button type="primary" :loading="saving" @click="saveSubmitNav">
          保存
        </el-button>
      </header>

      <el-select
        v-model="submitNavKeys"
        multiple
        filterable
        collapse-tags
        collapse-tags-tooltip
        placeholder="选择任务（多选）"
        class="task-select"
      >
        <el-option
          v-for="task in tasksInCategory"
          :key="task.key"
          :label="task.name"
          :value="task.key"
        />
      </el-select>
      <el-empty
        v-if="!loading && tasksInCategory.length === 0"
        description="此分类下还没有任务"
      />
    </section>
  </div>
</template>

<style scoped lang="scss">
.category-config-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px 16px 2em;
}

.page-title {
  font-weight: 600;
}

.page-header,
.config-panel {
  padding: 18px;
  background-color: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.06);
}

.category-summary {
  margin-top: 18px;

  p {
    margin: 0 0 8px;
    font-size: 13px;
    color: #909399;
  }

  h2 {
    margin: 0;
    font-size: 22px;
    line-height: 1.4;
    color: #303133;
  }
}

.config-panel {
  margin-top: 12px;
}

.config-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;

  h3 {
    margin: 0 0 6px;
    color: #303133;
  }

  p {
    margin: 0;
    color: #909399;
    line-height: 1.6;
  }
}

.task-select {
  width: 100%;
}

@media screen and (max-width: 700px) {
  .config-title {
    display: block;

    .el-button {
      margin-top: 12px;
    }
  }
}
</style>
