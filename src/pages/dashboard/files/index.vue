<template>
  <div class="files">
    <!-- 筛选框 -->
    <div class="panel header">
      <div class="item">
        <span class="label">分类</span>
        <!--TODO: multiple 多选待评估 -->
        <el-select size="default" v-model="selectCategory" filterable placeholder="请选择">
          <el-option label="全部" value="all" />
          <el-option label="默认" value="default" />
          <el-option v-for="item in categories" :key="item.k" :label="item.name" :value="item.k" />
          <el-option label="无关联任务" value="no-task" />
        </el-select>
      </div>
      <div class="item">
        <span class="label">任务</span>
        <el-select size="default" v-model="selectTask" filterable placeholder="请选择">
          <el-option label="全部" value="all" />
          <el-option v-for="item in filterTasks" :key="item.key" :label="item.name" :value="item.key"></el-option>
        </el-select>
      </div>
      <div class="item">
        <el-button :loading="batchDownStart" :disabled="selectTask === 'all'" type="primary" size="default"
          :icon="Download" @click="handleDownloadTask">下载任务中的文件</el-button>
      </div>
      <div class="item">
        <el-input size="default" clearable placeholder="请输入要检索的内容" :prefix-icon="Search" v-model="searchWord">
        </el-input>
      </div>
    </div>
    <div class="panel">
      <div class="export-btns flex fac">
        <el-dropdown trigger="click" @command="handleDropdownClick">
          <el-button type="primary" size="default">
            批量操作<el-icon class="el-icon--right">
              <arrow-down />
            </el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :disabled="selectItem.length === 0" command="download">下载</el-dropdown-item>
              <el-dropdown-item :disabled="selectItem.length === 0" command="delete">删除</el-dropdown-item>
              <el-dropdown-item :disabled="selectItem.length === 0" command="excel">导出记录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <div v-show="false">
          <!-- 迷惑的解决bug的手段 -->
          <el-dropdown trigger="click" @command="handleDropdownClick">
            <el-button type="primary" :disabled="selectItem.length === 0" size="default">
              批量操作
              <el-icon>
                <ArrowDown />
              </el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="download">下载</el-dropdown-item>
                <el-dropdown-item command="delete">删除</el-dropdown-item>
                <el-dropdown-item command="excel">导出记录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <el-button size="default" :icon="Refresh" @click="handleRefresh">刷新</el-button>
        <el-button title="导出表格中所有的数据" type="success" size="default" :icon="DataAnalysis" @click="() => {
          handleExportExcel(filterFiles, `筛选数据导出_${formatDate(new Date(), 'yyyy年MM月日hh时mm分ss秒')}.xls`);
        }" :disabled="showFilterFiles.length === 0">导出记录</el-button>
        <div class="showImgBtn">
          显示图片
          <el-switch inline-prompt v-model="showImg" active-color="#13ce66" inactive-color="#ff4949" active-text="是"
            inactive-text="否" />
        </div>
        <div class="showImgBtn">
          显示提交人姓名
          <el-switch inline-prompt v-model="showPeople" active-color="#13ce66" inactive-color="#ff4949" active-text="是"
            inactive-text="否" />
        </div>
      </div>
    </div>
    <div v-show="downloadList.length" class="panel">
      <tip>此部分 ”只会展示浏览器将直接预览的文件“ 的下载信息，暂不可切换页面，切换后会丢失当前正在下载进度</tip>
      <div class="progress-list">
        <div class="progress-item" v-for="(v, idx) in downloadList" :key="idx">
          <div class="progress">
            <el-progress text-inside :stroke-width="24" :percentage="v.percentage" :color="customColors">
            </el-progress>
            <el-button size="small" disabled type="text">
              {{ formatSize((v.percentage / 100) * v.size) }}/{{ formatSize(v.size) }}</el-button>
            <el-button size="small" type="text" @click="copyRes(v.url, '资源链接已复制到剪贴板')">复制链接</el-button>
          </div>
          <div class="des flex fc fac">
            <div class="filename">{{ v.filename }}</div>
            <div class="mimeType">{{ v.mimeType }}</div>
          </div>
        </div>
      </div>
    </div>
    <!-- 主体内容 -->
    <div class="panel">
      <el-table v-loading="isLoadingData" element-loading-text="Loading..." tooltip-effect="dark" multipleTable ref="multipleTable" @selection-change="handleSelectionChange" stripe
        border :default-sort="{ prop: 'date', order: 'descending' }" :max-height="666" :data="showFilterFiles"
        style="width: 100%">
        <el-table-column type="selection" width="55" />
        <el-table-column sortable prop="date" label="提交时间" width="200">
          <template #default="scope">{{ formatDate(new Date(scope.row.date)) }}</template>
        </el-table-column>
        <el-table-column prop="task_name" label="任务" width="150"></el-table-column>
        <el-table-column prop="name" label="文件名" width="200"></el-table-column>
        <el-table-column prop="size" label="大小">
          <template #default="scope">{{ scope.row.size === 0 ? '未知大小' : formatSize(scope.row.size) }}</template>
        </el-table-column>
        <template v-if="showImg">
          <el-table-column label="缩略图" width="120">
            <template #default="scope">
              <el-image preview-teleported :preview-src-list="previewImages" :initial-index="scope.$index" lazy
                style="width: 100px; height: 100px" :src="scope.row.cover" fit="cover">
                <template #placeholder>
                  <div class="imageLoading">Loading...</div>
                </template>
                <template #error>
                  <div class="imageLoading">
                    不支持
                    <el-icon>
                      <Picture />
                    </el-icon>
                  </div>
                </template>
              </el-image>
            </template>
          </el-table-column>
        </template>
        <template v-if="showPeople">
          <el-table-column prop="people" label="姓名">
            <template #default="scope">
              {{ scope.row.people || '-' }}
            </template>
          </el-table-column>
        </template>
        <el-table-column fixed="right" label="操作" width="140">
          <template #default="scope">
            <div class="text-btns">
              <el-button @click="checkInfo(scope.row)" type="text" size="small">查看提交信息</el-button>
              <el-button @click="downloadOne(scope.row)" type="text" size="small">下载</el-button>
              <el-button @click="handleDelete(scope.row)" type="text" size="small">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <!-- 分页 -->
    <div class="panel flex fc">
      <el-pagination :current-page="pageCurrent" @current-change="handlePageChange" background :page-count="pageCount"
        :page-sizes="[6, 10, 50, 100]" :page-size="pageSize" @size-change="handleSizeChange" :total="filterFiles.length"
        layout="total, sizes, prev, pager, next, jumper"></el-pagination>
    </div>
    <!-- 信息弹窗 -->
    <el-dialog :fullscreen="isMobile" title="提交填写的信息" v-model="showInfoDialog">
      <InfosForm :infos="infos" :disabled="true"/>
    </el-dialog>
    <LinkDialog v-model:value="showLinkModel" title="下载链接" :link="downloadUrl"></LinkDialog>
  </div>
</template>
<script lang="ts" setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  computed, onMounted, reactive, ref, watchEffect,
} from 'vue'
import { useStore } from 'vuex'
import LinkDialog from '@components/linkDialog.vue'
import {
  ArrowDown, Refresh, DataAnalysis, Download, Search, Picture,
} from '@element-plus/icons-vue'
import {
  copyRes, formatDate, formatSize, isSupportPreview, parseInfo,
} from '@/utils/stringUtil'
import { FileApi } from '@/apis'
import {
  downLoadByUrl, downLoadByXhr, tableItem, tableToExcel,
} from '@/utils/networkUtil'
import Tip from '../tasks/components/infoPanel/tip.vue'
import InfosForm from '@/components/InfosForm/index.vue'

const $store = useStore()
const showLinkModel = ref(false)
const downloadUrl = ref('')
const showImg = ref(false)
const showPeople = ref(true)
// 记录导出
const handleExportExcel = (files: FileApiTypes.File[], filename?: string) => {
  if (files.length === 0) {
    ElMessage.warning('表格中没有可导出的内容')
    return
  }
  const baseHeaders = ['提交时间', '任务', '文件名', '大小']
  if (showPeople.value) {
    baseHeaders.push('姓名')
  }
  const headers: (string | tableItem)[] = baseHeaders.map((v) => ({
    value: v,
    row: 2,
  }))

  const infosHeader = files.reduce((pre, value) => {
    JSON.parse(value.info).forEach((i: any) => {
      if (!pre.includes(i.text)) {
        pre.push(i.text)
      }
    })
    return pre
  }, [])
  headers.push({
    value: '提交信息',
    col: infosHeader.length,
  })

  const body = files.map(((v) => {
    const {
      date, task_name: taskName, name, size, people,
    } = v
    const infoObj = JSON.parse(v.info).reduce((pre, v) => {
      pre[v.text] = v.value
      return pre
    }, {})
    const info = infosHeader.map((v) => (infoObj[v] ?? '-'))
    const rows = [formatDate(new Date(date)), taskName, name, formatSize(size)]
    if (showPeople.value) {
      rows.push(people || '-')
    }
    rows.push(...info)
    return rows
  }))
  body.unshift(infosHeader)
  tableToExcel(headers, body, filename || `数据导出_${formatDate(new Date(), 'yyyy年MM月日hh时mm分ss秒')}.xls`)
  ElMessage.success('导出成功')
}
// 分类相关
const categories = computed(() => $store.state.category.categoryList)
const selectCategory = ref('all')
// 任务相关
const tasks = computed<TaskApiTypes.TaskItem[]>(() => $store.state.task.taskList)
const selectTask = ref('all')
const filterTasks = computed(() => {
  if (selectCategory.value === 'all') {
    return tasks.value
  }
  // eslint-disable-next-line vue/no-side-effects-in-computed-properties
  selectTask.value = 'all'
  return tasks.value.filter((t) => t.category === selectCategory.value)
})
const selectTaskName = computed(() => {
  const t = filterTasks.value.find((v) => v.key === selectTask.value)
  return t?.name
})

const isLoadingData = ref(false)
// 提交的所有文件
const files: FileApiTypes.File[] = reactive([])
const loadFiles = () => {
  isLoadingData.value = true
  files.splice(0, files.length)
  FileApi.getFileList().then((res) => {
    files.push(...res.data.files)
    isLoadingData.value = false
  })
}
const multipleTable: any = ref()
const searchWord = ref('')

// 用于展示的文件
// 1. 过滤指定任务
const filterFiles = computed(() => files.filter((f) => {
  if (selectCategory.value === 'no-task') {
    return tasks.value.every((t) => t.key !== f.task_key)
  }
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
  t.name,
  t.task_name,
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
      if (selectItem.length === 0) {
        ElMessage.warning('没有选中需要下载的内容')
        return
      }
      if (batchDownStart.value) {
        ElMessage.warning('已经有批量下载任务正在进行,请稍后再试')
        return
      }
      FileApi.batchDownload(ids, `批量下载_${formatDate(new Date(), 'yyyy年MM月日hh时mm分ss秒')}`).then((r) => {
        const { k } = r.data
        FileApi.getCompressFileUrl(k).then((v) => {
          showLinkModel.value = true
          downloadUrl.value = v
          downLoadByUrl(v, `${Date.now()}.zip`)
          batchDownStart.value = false
        }).catch((err) => {
          batchDownStart.value = false
          ElMessageBox.confirm(err.msg, '错误提示', {
            draggable: true,
          })
            .then(() => {
              copyRes(err.msg, '错误信息已复制到剪贴板')
              ElMessage.error('联系开发者协助处理')
            }).catch(() => {
              ElMessage.info('取消')
              copyRes(err.msg, '错误信息已复制到剪贴板')
              ElMessage.error('联系开发者协助处理')
            })
        })
      }).catch(() => {
        ElMessage.error('所选文件均已从服务器上移除')
        batchDownStart.value = false
      })
      batchDownStart.value = true
      ElMessage.info('开始归档选中的文件,请赖心等待,完成后将自动进行下载')
      break
    case 'delete':
      if (selectItem.length === 0) {
        ElMessage.warning('没有选中需要删除的内容')
        return
      }
      ElMessageBox.confirm('删除后无法恢复，是否删除', '数据无价，请谨慎操作').then(() => {
        FileApi.batchDel(ids).then(() => {
          files.splice(0, files.length, ...files.filter((v) => !ids.includes(v.id)))
          ElMessage.success('删除成功')
        })
      }).catch(() => {
        ElMessage.info('取消')
      })
      break
    case 'excel':
      if (selectItem.length === 0) {
        ElMessage.warning('没有选中需要导出的内容')
        return
      }
      handleExportExcel(selectItem, `批量导出_${formatDate(new Date(), 'yyyy年MM月日hh时mm分ss秒')}.xls`)
      ElMessage.success('导出成功')
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
  infos.push(...parseInfo(e.info))
  showInfoDialog.value = true
}

const customColors = [
  { color: '#f56c6c', percentage: 30 },
  { color: '#e6a23c', percentage: 50 },
  { color: '#409eff', percentage: 100 },
  { color: '#67c23a', percentage: 100 },
]
// 可预览文件下载列表
const downloadList = reactive<DownloadItem[]>([])
const downloadOne = (e: any) => {
  const { id, name, size } = e
  FileApi
    .getOneFileUrl(id)
    .then((res) => {
      const { link, mimeType } = res.data
      if (isSupportPreview(mimeType)) {
        const fileItem: DownloadItem = reactive<DownloadItem>({
          filename: name,
          mimeType,
          url: link,
          status: 'ready',
          size,
          percentage: 0,
        })
        downloadList.push(fileItem)
        downLoadByXhr(link, name, {
          progress(loaded, total) {
            fileItem.status = 'downloading'
            fileItem.percentage = Math.floor((loaded / total) * 100)
          },
          success() {
            fileItem.percentage = 100
            fileItem.status = 'done'
            // showLinkModel.value = true
            // downloadUrl.value = link
            ElMessage.success('文件下载成功')
          },
        })
        return
      }
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
  ElMessageBox.confirm('确认删除此文件吗？', '数据无价，请谨慎操作').then(() => {
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
// 当前页
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
  // TODO:待优化重复代码
  FileApi.batchDownload(ids, selectTaskName.value).then((r) => {
    const { k } = r.data
    FileApi.getCompressFileUrl(k).then((v) => {
      showLinkModel.value = true
      downloadUrl.value = v
      downLoadByUrl(v, `${Date.now()}.zip`)
      batchDownStart.value = false
    }).catch((err) => {
      batchDownStart.value = false
      ElMessageBox.confirm(err.msg, '错误提示', {
        draggable: true,
      })
        .then(() => {
          copyRes(err.msg, '错误信息已复制到剪贴板')
          ElMessage.error('联系开发者协助处理')
        }).catch(() => {
          ElMessage.info('取消')
          copyRes(err.msg, '错误信息已复制到剪贴板')
          ElMessage.error('联系开发者协助处理')
        })
    })
  }).catch(() => {
    ElMessage.error('所选任务中的文件均已从服务器上移除')
    batchDownStart.value = false
  })
  batchDownStart.value = true
  ElMessage.info('开始归档任务中的文件,请赖心等待,完成后将自动进行下载')
}

const previewImages = reactive([])

let fetching = false
const refreshFilesCover = () => {
  const ids = showFilterFiles.value.map((v) => v.id)
  if (ids.length === 0 || fetching) {
    return
  }
  fetching = true
  FileApi.checkImageFilePreviewUrl(ids).then((r) => {
    fetching = false
    const { data } = r
    if (data.length === 0 || data.length !== showFilterFiles.value.length) {
      return
    }
    previewImages.splice(0, previewImages.length)

    showFilterFiles.value.forEach((v, idx) => {
      const { cover, preview } = data[idx]
      v.cover = cover
      previewImages.push(preview)
    })
    // 添加裁剪参数
  })
}
watchEffect(() => {
  if (!showImg.value) {
    return
  }
  if (searchWord.value || pageCurrent.value || pageSize.value) {
    refreshFilesCover()
    return
  }
  refreshFilesCover()
})

onMounted(() => {
  loadFiles()
  $store.dispatch('category/getCategory')
  $store.dispatch('task/getTask')
})

const isMobile = computed(() => $store.getters['public/isMobile'])

</script>
<style scoped lang="scss">
.files {
  max-width: 1024px;
  margin: 0 auto;
  padding-bottom: 2em;
}

@media screen and (max-width: 700px) {
  .files {
    margin-top: 70px;
  }

  .text-btns {
    display: flex;
    flex-direction: column;

    :deep(.el-button) {
      margin-left: 0px;
      margin-bottom: 0px;
    }
  }

  .header {
    justify-content: center;
  }

  .export-btns {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-around;
  }
}

.panel {
  padding: 1em;
  background-color: #fff;
  margin: 10px auto;
  box-sizing: border-box;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  z-index: 1;

  .label {
    font-size: 12px;
    margin-right: 10px;
  }
}

.header {
  display: flex;
  flex-wrap: wrap;

  .item {
    margin-right: 10px;
    margin-bottom: 10px;
  }
}

.el-button {
  margin-left: 10px;
  margin-bottom: 10px;
}

.showImgBtn {
  margin-left: 10px;
  margin-bottom: 10px;
  font-size: 14px;
}

.imageLoading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.progress-list {
  margin-top: 10px;

  .progress-item {

    margin-bottom: 10px;

    .progress {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 6px;

      .el-progress--line {
        min-width: 200px;
        width: 260px;
      }

      .el-button {
        margin: 0 6px;
      }
    }

    .des {
      font-size: 12px;

      .filename {
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        word-break: keep-all;
        margin-right: 10px;
      }

      .mimeType {
        width: 60px;
        color: #409EFF;
      }
    }

    text-align: center;
  }
}
</style>
