<template>
  <div class="files">
    <div class="panel">
      <span>
        分类
      </span>
      <!--TODO: multiple 多选待评估 -->
      <el-select v-model="selectCategory" filterable placeholder="请选择">
        <el-option label="默认" value="default" />
        <el-option v-for="item in categorys" :key="item.k" :label="item.name" :value="item.k"></el-option>
      </el-select>
      <span>
        任务
      </span>
      <el-select v-model="selectTask" filterable placeholder="请选择">
        <el-option label="全部" value="默认" />
        <el-option v-for="item in tasks" :key="item.key" :label="item.name" :value="item.key"></el-option>
      </el-select>
    </div>
    <div class="panel">
      <el-table
        tooltip-effect="dark"
        multipleTable
        ref="multipleTable"
        @selection-change="handleSelectionChange"
        stripe
        border
        :default-sort="{ prop: 'date', order: 'descending' }"
        height="400"
        :data="files"
        style="width: 100%"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column sortable prop="date" label="提交时间" width="200">
          <template #default="scope">{{ formatDate(new Date(scope.row.date)) }}</template>
        </el-table-column>
        <el-table-column prop="task_name" label="任务" width="150"></el-table-column>
        <el-table-column prop="name" label="文件名" width="180"></el-table-column>
        <el-table-column prop="size" label="文件大小">
          <template #default="scope">{{ formatSize(scope.row.size) }}</template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="180">
          <template #default="scope">
            <el-button @click="checkInfo(scope.row)" type="text" size="small">查看提交信息</el-button>
            <el-button @click="downloadOne" type="text" size="small">下载</el-button>
            <el-button @click="handleDelete" type="text" size="small">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <div class="panel">
      <h1>分页区域</h1>
    </div>
  </div>
</template>
<script lang="ts">
import { FileApi } from '@/apis'
import { formatDate, formatSize } from '@/utils/stringUtil'
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
    const selectCategory = ref('default')
    // 任务相关
    const tasks = computed<any[]>(() => $store.state.task.taskList)
    const selectTask = ref('all')
    // 提交的所有文件
    const files: any[] = reactive([])
    const loadFiles = () => {
      files.slice(0, files.length)
      FileApi.getFileList().then((res) => {
        files.push(...res.data.files)
      })
    }
    const multipleTable: any = ref()
    /**
     * 琼空所有选项
     */
    const clearSelection = () => {
      multipleTable.value.clearSelection()
    }
    const handleSelectionChange = (e: any) => {
      console.log(e)
    }
    const checkInfo = (e: any) => {
      console.log(e)
    }
    const downloadOne = (e: any) => {
      console.log(e)
    }
    const handleDelete = (e: any) => {
      console.log(e)
    }
    onMounted(() => {
      loadFiles()
      $store.dispatch('category/getCategory')
      $store.dispatch('task/getTask')
    })
    return {
      files,
      multipleTable,
      handleSelectionChange,
      checkInfo,
      downloadOne,
      formatDate,
      handleDelete,
      formatSize,
      categorys,
      selectCategory,
      tasks,
      selectTask,
    }
  },
})
</script>
<style scoped lang="scss">
.files {
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
</style>
