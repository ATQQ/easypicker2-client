<template>
  <div class="files">
    <div class="panel header">
      <div class="item">
        <span class="label">分类</span>
        <!--TODO: multiple 多选待评估 -->
        <el-select size="medium" v-model="selectCategory" filterable placeholder="请选择">
          <el-option label="全部" value="all" />
          <el-option label="默认" value="default" />
          <el-option v-for="item in categorys" :key="item.k" :label="item.name" :value="item.k"></el-option>
        </el-select>
      </div>
      <div class="item">
        <span class="label">任务</span>
        <el-select size="medium" v-model="selectTask" filterable placeholder="请选择">
          <el-option label="全部" value="all" />
          <el-option
            v-for="item in filterTasks"
            :key="item.key"
            :label="item.name"
            :value="item.key"
          ></el-option>
        </el-select>
      </div>
      <div class="item">
        <el-input
          size="medium"
          clearable
          placeholder="请输入要检索的内容"
          prefix-icon="el-icon-search"
          v-model="searchWord"
        ></el-input>
      </div>
      <span style="align-self: center;" class="item">{{ filterFiles.length }} / {{ files.length }}</span>
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
        :data="showFilterFiles"
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
            <el-button @click="downloadOne(scope.row)" type="text" size="small">下载</el-button>
            <el-button @click="handleDelete(scope.row)" type="text" size="small">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <div class="panel tc">
      <el-pagination
        :current-page="pageCurrent"
        @current-change="handlePageChange"
        background
        :page-count="pageCount"
        :page-sizes="[6, 10, 50, 100]"
        :page-size="pageSize"
        @size-change="handleSizeChange"
        :total="filterFiles.length"
        layout="total, sizes, prev, pager, next, jumper"
      ></el-pagination>
    </div>
    <!-- 信息弹窗 -->
    <el-dialog title="提交填写的信息" v-model="showInfoDialog">
      <el-form>
        <el-form-item v-for="(info,idx) in infos" :key="idx" :label="info.text" label-width="120px">
          <el-input :modelValue="info.value"></el-input>
        </el-form-item>
      </el-form>
    </el-dialog>
    <LinkDialog v-model="showLinkModel" title="下载链接" :link="downloadUrl"></LinkDialog>
  </div>
</template>
<script lang="ts">
import { FileApi } from '@/apis'
import { formatDate, formatSize } from '@/utils/stringUtil'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  computed,
  defineComponent, onMounted, reactive, ref, watch, watchEffect,
} from 'vue'
import { useStore } from 'vuex'
import LinkDialog from '@components/linkDialog.vue'
import { downLoadByUrl } from '@/utils/networkUtil'

export default defineComponent({
  components: {
    LinkDialog,
  },
  setup() {
    const $store = useStore()
    // 分类相关
    const categorys = computed(() => $store.state.category.categoryList)
    const selectCategory = ref('all')
    // 任务相关
    const tasks = computed<any[]>(() => $store.state.task.taskList)
    const selectTask = ref('all')
    const filterTasks = computed(() => {
      if (selectCategory.value === 'all') {
        return tasks.value
      }
      // eslint-disable-next-line vue/no-side-effects-in-computed-properties
      selectTask.value = 'all'
      return tasks.value.filter((t) => t.category === selectCategory.value)
    })
    // 提交的所有文件
    const files: any[] = reactive([])
    const loadFiles = () => {
      files.slice(0, files.length)
      FileApi.getFileList().then((res) => {
        files.push(...res.data.files)
      })
    }
    const multipleTable: any = ref()
    const searchWord = ref('')

    // 用于展示的文件
    // 1. 过滤指定任务
    const filterFiles = computed(() => files.filter((f) => {
      if (filterTasks.value.length === 0) {
        return false
      }

      if (selectTask.value === 'all') {
        return filterTasks.value.find((t) => t.key === f.task_key)
      }

      return selectTask.value === f.task_key
      // 2. 过滤关键词(精细优化)
    }).filter((t) => (searchWord.value ? JSON.stringify([
      formatDate(new Date(t.date)),
      formatSize(t.size),
      t.people,
      // eslint-disable-next-line no-useless-escape
      t.info]).replace(/[:'"\{\},\[\]]/g, '').includes(searchWord.value) : true)))
    /**
     * 琼空所有选项
     */
    const clearSelection = () => {
      multipleTable.value.clearSelection()
    }
    const handleSelectionChange = (e: any) => {
      console.log(e)
    }
    const showInfoDialog = ref(false)
    const infos: any[] = reactive([])
    const checkInfo = (e: any) => {
      infos.splice(0, infos.length)
      infos.push(...JSON.parse(e.info))
      showInfoDialog.value = true
    }

    const showLinkModel = ref(false)
    const downloadUrl = ref('')
    const downloadOne = (e: any) => {
      const { id, name } = e
      FileApi
        .getOneFileUrl(id)
        .then((res) => {
          const { link } = res.data
          showLinkModel.value = true
          downloadUrl.value = link
          downLoadByUrl(link, name)
          ElMessage.success('已开始自动下载文件')
          setTimeout(() => {
            ElMessage.success('如未自动开始,可复制链接粘贴到浏览器下载(12h有效)')
          }, 100)
        })
        .catch(() => {
          ElMessage.error('文件已从服务器上移除')
        })
    }
    const handleDelete = (e: any) => {
      const idx = files.findIndex((v) => v === e)
      ElMessageBox.confirm('确认删除此文件吗', '提示').then(() => {
        FileApi.deleteOneFile(e.id).then(() => {
          ElMessage.success('删除成功')
          files.splice(idx, 1)
        })
      }).catch(() => {
        ElMessage.info('取消删除')
      })
    }

    // 分页
    const pageSize = ref(6)
    const handleSizeChange = (v: number) => {
      pageSize.value = v
    }
    const pageCount = computed(() => {
      const t = Math.ceil(filterFiles.value.length / pageSize.value)
      return t
    })
    const pageCurrent = ref(1)
    const showFilterFiles = computed(() => {
      const start = (pageCurrent.value - 1) * pageSize.value
      const end = (pageCurrent.value) * pageSize.value
      return filterFiles.value.slice(start, end)
    })
    const handlePageChange = (idx: number) => {
      pageCurrent.value = idx
    }
    onMounted(() => {
      loadFiles()
      $store.dispatch('category/getCategory')
      $store.dispatch('task/getTask')
    })
    return {
      filterFiles,
      files,
      showFilterFiles,
      multipleTable,
      handleSelectionChange,
      checkInfo,
      downloadOne,
      formatDate,
      handleDelete,
      formatSize,
      categorys,
      selectCategory,
      filterTasks,
      selectTask,
      searchWord,
      pageCount,
      handlePageChange,
      pageCurrent,
      pageSize,
      handleSizeChange,
      showInfoDialog,
      infos,
      showLinkModel,
      downloadUrl,
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
  .label {
    font-size: 12px;
    margin-right: 10px;
  }
}
.header {
  display: flex;
  justify-content: start;
  flex-wrap: wrap;
  .item {
    margin-right: 10px;
  }
}
</style>
