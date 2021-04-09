<template>
  <div class="tasks">
    <!-- 分类管理 -->
    <div class="panel">
      <!-- 按钮 -->
      <div class="btn-area">
        <h5>分类列表</h5>
      </div>
      <!-- 分类列表 -->
      <div style="margin-top: 15px" class="category-list">
        <el-tag> 默认 </el-tag>
        <el-tag
          v-for="tag in categorys"
          :key="tag.k"
          closable
          :disable-transitions="false"
          @close="handleDeleteCategory(tag)"
        >
          {{ tag.name }}
        </el-tag>
        <el-input
          class="input-new-tag"
          v-if="isShowCreateCategory"
          v-model="categoryName"
          ref="saveTagInput"
          size="small"
          @keyup.enter="addCategory"
          @focusout="addCategory"
        >
        </el-input>
        <el-button v-else class="button-new-tag" size="small" @click="isShowCreateCategory = true"
          >+ New 分类</el-button
        >
      </div>
    </div>

    <!-- 创建任务 -->
    <div class="panel">
      <div class="btn-area">
        <el-button
          size="small"
          class="margin-center"
          type="primary"
          :plain="!isShowCreateTask"
          @click="isShowCreateTask = !isShowCreateTask"
          >{{ isShowCreateTask ? "关闭新增面板" : "创建任务" }}</el-button
        >
      </div>
      <!-- 新增区域 -->
      <div v-show="isShowCreateTask" class="form-area">
        <div style="margin-top: 15px">
          <el-input placeholder="请输入任务名称" v-model="taskName">
            <template #append>
              <el-button @click="addPicker" type="primary">确定</el-button>
            </template>
          </el-input>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  computed,
  defineComponent, onMounted, reactive, ref,
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
      $store.dispatch('category/createCategory', categoryName.value).then(() => {
        ElMessage.success('创建成功')
      })
      categoryName.value = ''
    }
    const handleDeleteCategory = (c: any) => {
      ElMessageBox.confirm('是否删除', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }).then(() => {
        $store.dispatch('category/deleteCategory', c.k).then(() => {
          ElMessage.success('删除成功')
        })
      }).catch(() => {
        ElMessage.info('取消删除')
      })
    }

    // 任务相关
    const isShowCreateTask = ref(false)
    const taskName = ref('')
    const addPicker = () => {
      console.log(taskName.value)
    }
    onMounted(() => {
      $store.dispatch('category/getCategory')
    })
    return {
      categorys,
      isShowCreateCategory,
      categoryName,
      addCategory,
      isShowCreateTask,
      addPicker,
      taskName,
      handleDeleteCategory,
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
}
.el-tag{
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
</style>
