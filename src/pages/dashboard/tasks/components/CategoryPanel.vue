<template>
    <!-- 分类管理 -->
    <div class="panel">
        <!-- 按钮 -->
        <div class="btn-area">
            <h5>分类列表</h5>
            <h6 style="font-weight: lighter;">(点击分类可筛选任务)</h6>
        </div>
        <!-- 分类列表 -->
        <div style="margin-top: 15px" class="category-list">
            <el-tag
                :effect="category === 'default' ? 'dark' : 'plain'"
                @click="handleClickCategory('default')"
            >默认</el-tag>
            <el-tag
                v-for="tag in categorys"
                :key="tag.k"
                closable
                :effect="category === tag.k ? 'dark' : 'plain'"
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
</template>
<script lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  computed, defineComponent, ref,
} from 'vue'
import { useStore } from 'vuex'

export default defineComponent({
  name: 'categoryPanel',
  props: {
    category: {
      type: String,
      required: true,
      default: 'default',
    },
  },
  setup(props, context) {
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

    const handleClickCategory = (k: string) => {
      context.emit('update:category', k)
    }
    return {
      categorys,
      isShowCreateCategory,
      categoryName,
      addCategory,
      handleDeleteCategory,
      handleClickCategory,
    }
  },
})
</script>
<style scoped lang="scss">
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
</style>
