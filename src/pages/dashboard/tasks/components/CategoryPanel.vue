<template>
  <!-- 分类管理 -->
  <div class="panel">
    <!-- 按钮 -->
    <div class="btn-area">
      <h5>分类列表</h5>
      <h6 style="font-weight: lighter">(点击分类可筛选任务)</h6>
    </div>
    <!-- 分类列表 -->
    <div style="margin-top: 15px" class="category-list">
      <div class="new-tag-wrap">
        <!-- 新分类 -->
        <el-input
          class="input-new-tag el-tag"
          v-if="isShowCreateCategory"
          v-model="categoryName"
          ref="saveTagInput"
          placeholder="分类名称"
          @keyup.enter="addCategory"
          @focusout="addCategory"
        ></el-input>
        <el-button
          v-else
          class="button-new-tag el-tag"
          size="small"
          @click="isShowCreateCategory = true"
          >+ New 分类</el-button
        >
        <el-tag
          :effect="category === 'default' ? 'dark' : 'plain'"
          @click="handleClickCategory('default')"
          >默认{{ taskCount('default') }}</el-tag
        >
        <span class="list-tip"
          ><el-tag
            type="danger"
            :effect="category === 'trash' ? 'dark' : 'plain'"
            @click="handleClickCategory('trash')"
            ><el-icon><DeleteFilled /></el-icon> 回收站{{
              taskCount('trash')
            }}</el-tag
          ></span
        >
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
            >{{ tag.name }}{{ taskCount(tag.k) }}</el-tag
          >
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, defineComponent, ref } from 'vue'
import { DeleteFilled } from '@element-plus/icons-vue'
import { useStore } from 'vuex'

export default defineComponent({
  name: 'categoryPanel',
  components: {
    DeleteFilled
  },
  props: {
    category: {
      type: String,
      required: true,
      default: 'default'
    }
  },
  setup(props, context) {
    const $store = useStore()
    // 分类相关
    const categorys = computed(() => $store.state.category.categoryList)
    const tasks = computed(() => $store.state.task.taskList)
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
        cancelButtonText: '取消'
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
      categorys,
      isShowCreateCategory,
      categoryName,
      addCategory,
      handleDeleteCategory,
      handleClickCategory,
      taskCount
    }
  }
})
</script>
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
