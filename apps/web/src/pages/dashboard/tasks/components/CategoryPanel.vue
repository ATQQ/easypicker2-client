<script lang="ts">
import { DeleteFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, defineComponent, ref, toRef, watch } from 'vue'
import { useStore } from 'vuex'
import { CategoryApi } from '@/apis'

export default defineComponent({
  name: 'CategoryPanel',
  components: {
    DeleteFilled,
  },
  props: {
    category: {
      type: String,
      default: 'default',
    },
  },
  emits: ['update:category'],
  setup(props, context) {
    const category = toRef(props, 'category')
    const $store = useStore()
    // 分类相关
    const categorys = computed(() => $store.state.category.categoryList)
    const tasks = computed(() => $store.state.task.taskList)
    const submitNavKeys = ref<string[]>([])

    watch(
      () => [category.value, categorys.value] as const,
      () => {
        const k = category.value
        if (k === 'default' || k === 'trash') {
          submitNavKeys.value = []
          return
        }
        const c = categorys.value.find((x: { k: string }) => x.k === k)
        const keys = c?.submitNavKeys
        submitNavKeys.value = Array.isArray(keys) ? [...keys] : []
      },
      { immediate: true, deep: true },
    )

    const tasksInCategory = computed(() =>
      tasks.value.filter((t: { category: string }) => t.category === category.value),
    )

    const saveSubmitNav = () => {
      const k = category.value
      if (k === 'default' || k === 'trash')
        return
      CategoryApi.updateSubmitNav(k, submitNavKeys.value).then(() => {
        ElMessage.success('已保存提交页导航')
        return $store.dispatch('category/getCategory')
      })
    }
    const taskCount = (c: string) => {
      const count = tasks.value.filter((t: any) => t.category === c).length
      return count === 0 ? '' : ` (${count})`
    }
    const isShowCreateCategory = ref(false)
    const categoryName = ref('')
    const addCategory = () => {
      isShowCreateCategory.value = false
      if (!categoryName.value.trim()) {
        // ElMessage.warning('不能为空')
        return
      }
      $store
        .dispatch('category/createCategory', categoryName.value)
        .then(() => {
          ElMessage.success('创建成功')
        })
        .catch((err) => {
          if (err.code === 2001) {
            ElMessage.warning('分类名称已存在')
          }
        })
      categoryName.value = ''
    }

    const handleClickCategory = (k: string) => {
      context.emit('update:category', k)
    }

    const handleDeleteCategory = (c: any) => {
      ElMessageBox.confirm('是否删除', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
      })
        .then(() => {
          $store.dispatch('category/deleteCategory', c.k).then(() => {
            // 删除后变动的默认选择
            handleClickCategory('default')
            ElMessage.success('删除成功')
            // 获取最新的任务
            $store.dispatch('task/getTask')
          })
        })
        .catch(() => {
          ElMessage.info('取消删除')
        })
    }

    return {
      category,
      categorys,
      isShowCreateCategory,
      categoryName,
      addCategory,
      handleDeleteCategory,
      handleClickCategory,
      taskCount,
      submitNavKeys,
      tasksInCategory,
      saveSubmitNav,
    }
  },
})
</script>

<template>
  <!-- 分类管理 -->
  <div class="panel">
    <!-- 按钮 -->
    <div class="btn-area">
      <h5>分类列表</h5>
      <h6 style="font-weight: lighter">
        (点击分类可筛选任务)
      </h6>
    </div>
    <!-- 分类列表 -->
    <div style="margin-top: 15px" class="category-list">
      <div class="new-tag-wrap">
        <!-- 新分类 -->
        <el-input
          v-if="isShowCreateCategory"
          v-model="categoryName"
          class="input-new-tag el-tag"
          placeholder="分类名称"
          @keyup.enter="addCategory"
          @focusout="addCategory"
        />
        <el-button
          v-else
          class="button-new-tag el-tag"
          size="small"
          @click="isShowCreateCategory = true"
        >
          + New 分类
        </el-button>
        <el-tag
          :effect="category === 'default' ? 'dark' : 'plain'"
          @click="handleClickCategory('default')"
        >
          默认{{ taskCount('default') }}
        </el-tag>
        <span class="list-tip"><el-tag
          type="danger"
          :effect="category === 'trash' ? 'dark' : 'plain'"
          @click="handleClickCategory('trash')"
        ><el-icon><DeleteFilled /></el-icon> 回收站{{
          taskCount('trash')
        }}</el-tag></span>
      </div>
      <div class="tag-wrap">
        <div class="tag-list">
          <el-tag
            v-for="tag in categorys"
            :key="tag.k"
            closable
            :effect="category === tag.k ? 'dark' : 'plain'"
            @close="handleDeleteCategory(tag)"
            @click="handleClickCategory(tag.k)"
          >
            {{ tag.name }}{{ taskCount(tag.k) }}
          </el-tag>
        </div>
      </div>
      <div
        v-if="category !== 'default' && category !== 'trash'"
        class="submit-nav-box"
      >
        <div class="sn-title">
          提交页快捷切换
        </div>
        <p class="sn-desc">
          公开任务页展示同分类下可选任务，便于投稿人在多个收集项间切换
        </p>
        <el-select
          v-model="submitNavKeys"
          multiple
          filterable
          collapse-tags
          collapse-tags-tooltip
          placeholder="选择任务（多选）"
          class="sn-select"
        >
          <el-option
            v-for="t in tasksInCategory"
            :key="t.key"
            :label="t.name"
            :value="t.key"
          />
        </el-select>
        <el-button type="primary" size="small" class="sn-save" @click="saveSubmitNav">
          保存
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.el-tag {
  margin-left: 10px;
  margin-bottom: 10px;
  cursor: pointer;
}
.new-tag-wrap {
  display: flex;
  align-items: center;
}
.button-new-tag {
  margin-left: 10px;
  height: 32px;
  line-height: 30px;
  padding-top: 0;
  padding-bottom: 0;
}
.input-new-tag {
  width: 120px;
  padding: 0;
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
.list-tip {
  // color: #67c23a;
  // font-size: 10px;
  margin-right: 10px;
  flex: 1;
  text-align: right;
}
.tag-wrap {
  width: 100%;
  height: 150px;
}
.submit-nav-box {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed #dcdfe6;
}
.sn-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
}
.sn-desc {
  font-size: 12px;
  color: #909399;
  margin: 0 0 8px;
  line-height: 1.5;
}
.sn-select {
  width: 100%;
}
.sn-save {
  margin-top: 8px;
}
.tag-list {
  height: 150px;
  overflow-x: hidden;
  overflow-y: scroll;
  display: flex;
  flex-wrap: wrap;
  :deep(.el-tag) {
    width: 140px;
  }
  :deep(.el-tag__content) {
    width: 100px;
    text-align: center;
    text-overflow: ellipsis;
    word-break: keep-all;
    overflow: hidden;
  }
}
</style>
