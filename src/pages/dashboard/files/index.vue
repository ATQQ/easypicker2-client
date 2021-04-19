<template>
  <div class="files">
    <!-- 筛选框 -->
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
      <el-dropdown @command="handleDropdownClick">
        <el-button type="primary" :disabled="selectItem.length === 0" size="medium">
          批量操作
          <i class="el-icon-arrow-down el-icon--right"></i>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="download">下载</el-dropdown-item>
            <el-dropdown-item command="delete">删除</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-button
        :loading="batchDownStart"
        :disabled="selectTask === 'all'"
        type="primary"
        size="medium"
        icon="el-icon-download"
        @click="handleDownloadTask"
      >导出任务</el-button>
      <el-button size="medium" icon="el-icon-refresh" @click="handleRefresh">刷新</el-button>
      <el-button
        type="success"
        size="medium"
        icon="el-icon-data"
        @click="handlEexportExcell"
      >导出Excel</el-button>
    </div>
    <!-- 主体内容 -->
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
    <!-- 分页 -->
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
    <LinkDialog v-model:value="showLinkModel" title="下载链接" :link="downloadUrl"></LinkDialog>
  </div>
</template>
<script lang="ts">
import { FileApi } from '@/apis'
import { formatDate, formatSize } from '@/utils/stringUtil'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  computed,
  defineComponent, onMounted, reactive, ref,
} from 'vue'
import { useStore } from 'vuex'
import LinkDialog from '@components/linkDialog.vue'
import { downLoadByUrl, tableToExcel } from '@/utils/networkUtil'

export default defineComponent({
  components: {
    LinkDialog,
  },
  setup() {
    const $store = useStore()
    const showLinkModel = ref(false)
    const downloadUrl = ref('')
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
      files.splice(0, files.length)
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
     * 清空所有选项
     */
    const clearSelection = () => {
      multipleTable.value.clearSelection()
    }
    // 多选选中的项
    const selectItem: any[] = reactive([])
    const handleSelectionChange = (e: any) => {
      selectItem.splice(0, selectItem.length)
      selectItem.push(...e)
    }
    const batchDownStart = ref(false)
    const handleDropdownClick = (e: string) => {
      const ids: number[] = selectItem.map((v) => v.id)
      switch (e) {
        case 'download':
          if (batchDownStart.value) {
            ElMessage.warning('已经有批量下载任务正在进行,请稍后再试')
            return
          }
          FileApi.batchDownload(ids).then((r) => {
            const { k } = r.data
            FileApi.getCompressFileUrl(k).then((v) => {
              showLinkModel.value = true
              downloadUrl.value = v
              downLoadByUrl(v, `${Date.now()}.zip`)
              batchDownStart.value = false
            })
          }).catch(() => {
            ElMessage.error('所选文件均已从服务器上移除')
            batchDownStart.value = false
          })
          batchDownStart.value = true
          ElMessage.info('开始归档选中的文件,请赖心等待,完成后将自动进行下载')
          break
        case 'delete':
          ElMessageBox.confirm('确认删除吗?删除后无法恢复', '提示').then(() => {
            FileApi.batchDel(ids).then(() => {
              files.splice(0, files.length, ...files.filter((v) => !ids.includes(v.id)))
              ElMessage.success('删除成功')
            })
          }).catch(() => {
            ElMessage.info('取消')
          })
          break
        default:
          break
      }
      clearSelection()
    }
    const showInfoDialog = ref(false)
    const infos: any[] = reactive([])
    const checkInfo = (e: any) => {
      infos.splice(0, infos.length)
      infos.push(...JSON.parse(e.info))
      showInfoDialog.value = true
    }

    const downloadOne = (e: any) => {
      const { id, name } = e
      FileApi
        .getOneFileUrl(id)
        .then((res) => {
          const { link } = res.data
          showLinkModel.value = true
          downloadUrl.value = link
          downLoadByUrl(link, name)
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

    // 刷新文件列表

    const handleRefresh = () => {
      loadFiles()
      ElMessage.success('刷新成功')
    }
    const handleDownloadTask = () => {
      const ids: number[] = files.filter((f) => f.task_key === selectTask.value).map((v) => v.id)
      if (ids.length === 0) {
        ElMessage.warning('该任务中没有数据')
        return
      }
      if (batchDownStart.value) {
        ElMessage.warning('已经有批量下载任务正在进行,请稍后再试')
        return
      }
      FileApi.batchDownload(ids).then((r) => {
        const { k } = r.data
        FileApi.getCompressFileUrl(k).then((v) => {
          showLinkModel.value = true
          downloadUrl.value = v
          downLoadByUrl(v, `${Date.now()}.zip`)
          batchDownStart.value = false
        })
      }).catch(() => {
        ElMessage.error('所选任务中的文件均已从服务器上移除')
        batchDownStart.value = false
      })
      batchDownStart.value = true
      ElMessage.info('开始归档任务中的文件,请赖心等待,完成后将自动进行下载')
    }

    const handlEexportExcell = () => {
      if (showFilterFiles.value.length === 0) {
        ElMessage.warning('表格中没有可导出的内容')
        return
      }
      const headers = ['提交时间', '任务', '文件名', '文件大小', '提交信息']
      const body = showFilterFiles.value.map(((v) => {
        const {
          date, task_name: taskName, name, size,
        } = v
        const info = JSON.parse(v.info).map((i:any) => `${i.text}--${i.value}`).join(',')
        return [formatDate(new Date(date)), taskName, name, formatSize(size), info]
      }))
      tableToExcel(headers, body)
      ElMessage.success('导出成功')
    }
    onMounted(() => {
      loadFiles()
      $store.dispatch('category/getCategory')
      $store.dispatch('task/getTask')
    })
    return {
      handlEexportExcell,
      handleRefresh,
      handleDownloadTask,
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
      selectItem,
      handleDropdownClick,
      batchDownStart,
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
.el-button {
  margin-left: 10px;
}
</style>
