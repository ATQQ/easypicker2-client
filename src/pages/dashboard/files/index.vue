<script lang="ts" setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref, watchEffect } from 'vue'
import { useStore } from 'vuex'
import LinkDialog from '@components/linkDialog.vue'
import {
  ArrowDown,
  DataAnalysis,
  Download,
  Picture,
  Refresh,
  Search,
} from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'
import Tip from '../tasks/components/infoPanel/tip.vue'
import {
  copyRes,
  formatDate,
  formatSize,
  getFileSuffix,
  normalizeFileName,
  parseInfo,
} from '@/utils/stringUtil'
import { ActionServiceAPI, FileApi } from '@/apis'
import type { tableItem } from '@/utils/networkUtil'
import { downLoadByUrl, tableToExcel } from '@/utils/networkUtil'
import InfosForm from '@/components/InfosForm/index.vue'
import { ActionType, DownloadStatus, filenamePattern } from '@/constants'
import { useIsMobile, useSiteConfig, useSpaceUsage } from '@/composables'

const { value: siteConfig } = useSiteConfig()
const isOpenPraise = computed(() => siteConfig.value.openPraise)

const { limitDownload, spaceUsageText, moneyUsageText, limitSpace, limitWallet, priceText } = useSpaceUsage()

const $store = useStore()
const $route = useRoute()
const showLinkModel = ref(false)
const downloadUrl = ref('')
const showImg = ref(localStorage.getItem('ep-show-images') === 'true')
const showPeople = ref(true)
const showOriginName = ref(false)
const showHistoryPanel = ref(false)
const historyDownloadRecord = reactive({
  actions: [],
  pageSize: 3,
  /**
   * 总页数
   */
  pageCount: 0,
  pageCurrent: 1,
  pageTotal: 0,
  compressTask: [],
})

function loadActions() {
  // 已记录的task
  const compressTask: ActionApiTypes.DownloadActionData[] = JSON.parse(
    localStorage.getItem('ep_compress_task') || '[]',
  )
  historyDownloadRecord.compressTask = compressTask

  ActionServiceAPI.getDownloadActions(
    historyDownloadRecord.pageSize,
    historyDownloadRecord.pageCurrent,
    compressTask.map(v => v.id),
  ).then((v) => {
    const { actions, sum } = v.data
    const haveArchive = !!actions.find(
      v => v.status === DownloadStatus.ARCHIVE,
    )

    actions
      .filter(v => v.type === ActionType.Compress)
      .forEach((action) => {
        const existIndex = compressTask.findIndex(v => v.id === action.id)
        // 判断状态
        // SUCCESS
        //  存在，触发下载，从compressTask移除
        if (action.status === DownloadStatus.SUCCESS && existIndex !== -1) {
          // 展示弹窗
          downloadUrl.value = action.url
          showLinkModel.value = true
          downLoadByUrl(action.url)
          // ElMessage.success(`自动下载归档任务 ${action.tip}`)
          compressTask.splice(existIndex, 1)
        }
        // Archive
        //  不存在，push进compressTask
        if (action.status === DownloadStatus.ARCHIVE && existIndex === -1) {
          compressTask.push(action)
        }

        // ERROR
        if (action.status === DownloadStatus.FAIL && existIndex !== -1) {
          compressTask.splice(existIndex, 1)
        }
      })
    // TODO:之后根据反馈优化
    historyDownloadRecord.compressTask = compressTask
    localStorage.setItem('ep_compress_task', JSON.stringify(compressTask))
    if (haveArchive) {
      // 递归查询
      setTimeout(loadActions, 1000)
    }
    historyDownloadRecord.pageTotal = sum
    historyDownloadRecord.actions = actions
    historyDownloadRecord.pageCount = Math.ceil(
      sum / historyDownloadRecord.pageSize,
    )
  })
}
function handleHistoryActionPageChange(v) {
  historyDownloadRecord.pageCurrent = v
  loadActions()
}

// 分类相关
const categories = computed(() => $store.state.category.categoryList)
const selectCategory = ref('all')
// 任务相关
const tasks = computed<TaskApiTypes.TaskItem[]>(
  () => $store.state.task.taskList,
)
const selectTask = ref('all')
const filterTasks = computed(() => {
  if (selectCategory.value === 'all') {
    return tasks.value
  }
  // eslint-disable-next-line vue/no-side-effects-in-computed-properties
  selectTask.value = 'all'
  return tasks.value.filter(t => t.category === selectCategory.value)
})
const selectTaskName = computed(() => {
  const t = filterTasks.value.find(v => v.key === selectTask.value)
  return t?.name
})

watchEffect(() => {
  if (
    tasks.value.length
    && tasks.value.some(v => v.key === $route.query.task)
  ) {
    selectTask.value = `${$route.query.task}`
  }
})

// 记录导出
function handleExportExcel(files: FileApiTypes.File[], filename?: string) {
  if (files.length === 0) {
    ElMessage.warning('表格中没有可导出的内容')
    return
  }
  const baseHeaders = ['提交时间', '任务', '文件名', '大小']
  if (showOriginName.value) {
    baseHeaders.push('原文件名')
  }
  if (showPeople.value) {
    baseHeaders.push('姓名')
  }
  const headers: (string | tableItem)[] = baseHeaders.map(v => ({
    value: v,
    row: 2,
  }))

  const infosHeader = files.reduce((pre, value) => {
    try {
      JSON.parse(value.info).forEach((i: any) => {
        if (!pre.includes(i.text)) {
          pre.push(i.text)
        }
      })
    }
    catch (error) {
      ElMessage.error({
        message: `数据异常${value.name}，可联系平台管理员处理`,
        duration: 5000,
      })
      console.log(value)
    }
    return pre
  }, [])
  headers.push({
    value: '提交信息',
    col: infosHeader.length,
  })

  const body = files.map((v) => {
    const { date, task_name: taskName, name, size, people } = v
    try {
      const infoObj = JSON.parse(v.info).reduce((pre, v) => {
        pre[v.text] = `${v.value}`
        return pre
      }, {})
      const info = infosHeader.map(v => infoObj[v] ?? '-')
      const rows = [formatDate(new Date(date)), taskName, name, formatSize(size)]
      if (showOriginName.value) {
        rows.push(v.origin_name || '-')
      }
      if (showPeople.value) {
        rows.push(people || '-')
      }
      rows.push(...info)
      return rows
    }
    catch (error) {
      ElMessage.error({
        message: `数据异常${v.name}，可联系平台管理员处理`,
        duration: 5000,
      })
      console.log(v)
    }
    return []
  }).filter(v => !!v.length)
  body.unshift(infosHeader)

  const _filename = filename || `数据导出_${formatDate(new Date(), 'yyyy年MM月日hh时mm分ss秒')}.xlsx`
  const resFileName = selectTaskName.value ? `${normalizeFileName(selectTaskName.value)}_${_filename}` : _filename

  tableToExcel(
    headers,
    body,
    resFileName,
  )
  ElMessage.success('导出成功')
}

const isLoadingData = ref(false)
// 提交的所有文件
const files: FileApiTypes.File[] = reactive([])
function loadFiles() {
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
const filterFiles = computed(() =>
  files
    .filter((f) => {
      if (selectCategory.value === 'no-task') {
        return tasks.value.every(t => t.key !== f.task_key)
      }
      if (filterTasks.value.length === 0) {
        return false
      }

      if (selectTask.value === 'all') {
        return filterTasks.value.find(t => t.key === f.task_key)
      }

      return selectTask.value === f.task_key
      // 2. 过滤关键词(精细优化)
    })
    .filter(t =>
      searchWord.value
        ? JSON.stringify([
          formatDate(new Date(t.date)),
          formatSize(t.size),
          t.people,
          t.name,
          t.task_name,

          t.info,
        ])
          .replace(/[:'"{},[\]]/g, '')
          .includes(searchWord.value)
        : true,
    ),
)

/**
 * 清空所有选项
 */
function clearSelection() {
  multipleTable.value.clearSelection()
}
// 多选选中的项
const selectItem: any[] = reactive([])
function handleSelectionChange(e: any) {
  selectItem.splice(0, selectItem.length)
  selectItem.push(...e)
}
const batchDownStart = ref(false)
function handleDropdownClick(e: string) {
  const ids: number[] = selectItem.map(v => v.id)
  switch (e) {
    case 'download':
      if (limitDownload.value) {
        ElMessage.error('下载功能已被限制，请联系管理员扩容，或自行删除历史无用文件')
        return
      }
      if (selectItem.length === 0) {
        ElMessage.warning('没有选中需要下载的内容')
        return
      }
      if (batchDownStart.value) {
        ElMessage.warning('已经有批量下载任务正在进行,请稍后再试')
        return
      }
      FileApi.batchDownload(
        ids,
        `批量下载_${formatDate(new Date(), 'yyyy年MM月日hh时mm分ss秒')}`,
      )
        .then(() => {
          loadActions()
        })
        .catch(() => {
          ElMessage.error('所选文件均已从服务器上移除')
          batchDownStart.value = false
        })
      ElMessage.info('开始归档选中的文件,请赖心等待')
      break
    case 'delete':
      if (selectItem.length === 0) {
        ElMessage.warning('没有选中需要删除的内容')
        return
      }
      ElMessageBox.confirm('删除后无法恢复，是否删除', '数据无价，请谨慎操作')
        .then(() => {
          FileApi.batchDel(ids).then(() => {
            files.splice(
              0,
              files.length,
              ...files.filter(v => !ids.includes(v.id)),
            )
            ElMessage.success('删除成功')
          })
        })
        .catch(() => {
          ElMessage.info('取消')
        })
      break
    case 'excel':
      if (selectItem.length === 0) {
        ElMessage.warning('没有选中需要导出的内容')
        return
      }
      handleExportExcel(
        selectItem,
        `批量导出_${formatDate(new Date(), 'yyyy年MM月日hh时mm分ss秒')}.xlsx`,
      )
      ElMessage.success('导出成功')
      break
    default:
      break
  }
  clearSelection()
}
const showInfoDialog = ref(false)
const infos: any[] = reactive([])
function checkInfo(e: any) {
  infos.splice(0, infos.length)
  infos.push(...parseInfo(e.info))
  showInfoDialog.value = true
}

const showRenameDialog = ref(false)
const renameForm = reactive({
  oldName: '',
  newName: '',
  suffix: '',
  id: -1,
})
function rewriteFilename(e: any) {
  const { id, name } = e
  const suffix = getFileSuffix(name)
  renameForm.oldName = name
  renameForm.suffix = suffix
  renameForm.id = id
  showRenameDialog.value = true
}

function handleSaveNewName() {
  // 文件名校验，不能有系统不支持的字符
  if (filenamePattern.test(renameForm.newName)) {
    ElMessage.error(`文件名不能包含${filenamePattern.source}等字符`)
    filenamePattern.lastIndex = 0
    return
  }
  FileApi.updateFilename(
    renameForm.id,
    `${renameForm.newName}${renameForm.suffix}`,
  )
    .then(() => {
      ElMessage.success('修改成功')
      const file = files.find(v => v.id === renameForm.id)
      file.name = `${renameForm.newName}${renameForm.suffix}`
    })
    .catch(() => {
      ElMessage.error('修改失败')
    })
    .finally(() => {
      showRenameDialog.value = false
    })
}

function downloadOne(e: any) {
  if (limitDownload.value) {
    ElMessage.error('下载功能已被限制，请联系管理员扩容，或自行删除历史无用文件')
    return
  }
  const { id, name } = e
  FileApi.getOneFileUrl(id)
    .then((res) => {
      const { link } = res.data
      showLinkModel.value = true
      downloadUrl.value = link
      downLoadByUrl(link, name)
      // 刷新
      loadActions()
      // 刷新次数
      setTimeout(() => {
        refreshFilesDownloadCount()
      }, 1000)
    })
    .catch(() => {
      ElMessage.error('文件已从服务器上移除')
    })
}
function handleDelete(e: any) {
  const idx = files.findIndex(v => v === e)
  ElMessageBox.confirm('确认删除此文件吗？', '数据无价，请谨慎操作')
    .then(() => {
      FileApi.deleteOneFile(e.id).then(() => {
        ElMessage.success('删除成功')
        files.splice(idx, 1)
      })
    })
    .catch(() => {
      ElMessage.info('取消删除')
    })
}

// 分页
const pageSize = ref(6)
function handleSizeChange(v: number) {
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
  const end = pageCurrent.value * pageSize.value
  return filterFiles.value.slice(start, end)
})

const filterFileSize = computed(() =>
  formatSize(filterFiles.value.reduce((acc, cur) => acc + cur.size, 0)),
)
const fileListSize = computed(() =>
  formatSize(files.reduce((acc, cur) => acc + cur.size, 0)),
)
function handlePageChange(idx: number) {
  pageCurrent.value = idx
}

// 刷新文件列表

function handleRefresh() {
  ElMessage.success({
    message: '刷新成功',
  })
  loadFiles()
}
function handleDownloadTask() {
  const ids: number[] = files
    .filter(f => f.task_key === selectTask.value)
    .map(v => v.id)
  if (ids.length === 0) {
    ElMessage.warning('该任务中没有数据')
    return
  }
  if (batchDownStart.value) {
    ElMessage.warning('已经有批量下载任务正在进行,请稍后再试')
    return
  }
  batchDownStart.value = true
  FileApi.batchDownload(ids, selectTaskName.value)
    .then(() => {
      loadActions()
    })
    .catch(() => {
      ElMessage.error('所选任务中的文件均已从服务器上移除')
    })
    .finally(() => {
      setTimeout(() => {
        batchDownStart.value = false
      }, 1000)
    })
  ElMessage.info('开始归档选中的文件,请赖心等待')
}

const previewData = reactive<
  { cover: string, preview: string, name: string, date: string, id: number }[]
>([])

const viewImageFilename = ref('')

const previewImages = computed(() => {
  // if (!sortProps.prop) {
  return previewData.map(v => v.preview)
  // }
  // TODO：下面代码暂不生效，后续再支持表格排序场景
  // const temp = [...previewData]
  // temp.sort((a, b) => {
  //   if (sortProps.order === 'descending') {
  //     return a[sortProps.prop] - b[sortProps.prop]
  //   }
  //   return b[sortProps.prop] - a[sortProps.prop]
  // })
  // return temp.map((v) => v.preview)
})

function handleSwitchImage(idx: number) {
  viewImageFilename.value = showFilterFiles.value[idx].name
}

let fetching = false
function refreshFilesCover() {
  const ids = showFilterFiles.value.map(v => v.id)
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
    previewData.splice(0, previewData.length)
    showFilterFiles.value.forEach((v, idx) => {
      const { cover, preview } = data[idx]
      v.cover = cover
      previewData.push({ cover, preview, name: v.name, date: v.date, id: v.id })
    })
  })
}

function refreshFilesDownloadCount() {
  const ids = showFilterFiles.value.map(v => v.id)
  if (ids.length === 0 || fetching) {
    return
  }

  FileApi.fileDownloadCount(ids).then((r) => {
    const { data } = r
    if (data.length === 0 || data.length !== showFilterFiles.value.length) {
      return
    }

    showFilterFiles.value.forEach((v, idx) => {
      v.downloadCount = data[idx]
    })
  })
}
watchEffect(() => {
  if (searchWord.value || pageCurrent.value || pageSize.value) {
    refreshFilesDownloadCount()
    return
  }
  refreshFilesDownloadCount()
})

watchEffect(() => {
  window.localStorage.setItem('ep-show-images', `${showImg.value}`)
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
  loadActions()
  $store.dispatch('category/getCategory')
  $store.dispatch('task/getTask')
})

const isMobile = useIsMobile()
function handleShowDetail() {
  ElMessageBox.confirm(priceText.value)
}
</script>

<template>
  <div class="files">
    <!-- 筛选框 -->
    <div class="panel header">
      <div class="item">
        <span class="label">分类</span>
        <!-- TODO: multiple 多选待评估 -->
        <el-select v-model="selectCategory" size="default" filterable placeholder="请选择">
          <el-option label="全部" value="all" />
          <el-option label="默认" value="default" />
          <el-option v-for="item in categories" :key="item.k" :label="item.name" :value="item.k" />
          <el-option label="无关联任务" value="no-task" />
          <el-option label="♻️回收站♻️" value="trash" />
        </el-select>
      </div>
      <div class="item">
        <span class="label">任务</span>
        <el-select v-model="selectTask" size="default" filterable placeholder="请选择">
          <el-option label="全部" value="all" />
          <el-option v-for="item in filterTasks" :key="item.key" :label="item.name" :value="item.key" />
        </el-select>
      </div>
      <div class="item">
        <el-button
          :loading="batchDownStart" :disabled="selectTask === 'all'" type="primary" size="default"
          :icon="Download" @click="handleDownloadTask"
        >
          下载任务中的文件
        </el-button>
      </div>
      <div class="item">
        <el-input v-model="searchWord" size="default" clearable placeholder="请输入要检索的内容" :prefix-icon="Search" />
      </div>
    </div>
    <div class="panel">
      <div class="export-btns flex fac">
        <el-dropdown trigger="click" @command="handleDropdownClick">
          <el-button type="primary" size="default">
            批量操作<el-icon class="el-icon--right">
              <ArrowDown />
            </el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :disabled="selectItem.length === 0" command="download">
                下载
              </el-dropdown-item>
              <el-dropdown-item :disabled="selectItem.length === 0" command="delete">
                删除
              </el-dropdown-item>
              <el-dropdown-item :disabled="selectItem.length === 0" command="excel">
                导出记录
              </el-dropdown-item>
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
                <el-dropdown-item command="download">
                  下载
                </el-dropdown-item>
                <el-dropdown-item command="delete">
                  删除
                </el-dropdown-item>
                <el-dropdown-item command="excel">
                  导出记录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <el-button size="default" :icon="Refresh" @click="handleRefresh">
          刷新
        </el-button>
        <el-button
          title="导出表格中所有的数据" type="success" size="default" :icon="DataAnalysis" :disabled="showFilterFiles.length === 0" @click="() => {
            handleExportExcel(
              filterFiles,
              `筛选数据导出_${formatDate(
                new Date(),
                'yyyy年MM月日hh时mm分ss秒',
              )}.xlsx`,
            )
          }
          "
        >
          导出记录
        </el-button>
        <div class="control-item">
          显示图片
          <el-switch
            v-model="showImg" inline-prompt active-color="#13ce66" inactive-color="#ff4949" active-text="是"
            inactive-text="否"
          />
        </div>
        <div class="control-item">
          展示原文件名
          <el-switch
            v-model="showOriginName" inline-prompt active-color="#13ce66" inactive-color="#ff4949"
            active-text="是" inactive-text="否"
          />
        </div>
        <div class="control-item">
          显示提交人姓名
          <el-switch
            v-model="showPeople" inline-prompt active-color="#13ce66" inactive-color="#ff4949" active-text="是"
            inactive-text="否"
          />
        </div>
        <div class="control-item">
          ⏰ 查看下载历史
          <el-switch
            v-model="showHistoryPanel" style="
              --el-switch-on-color: #13ce66;
              --el-switch-off-color: #ff4949;
            "
          />
        </div>
      </div>
    </div>
    <div v-show="historyDownloadRecord.compressTask.length && !showHistoryPanel" class="panel">
      <Tip style="font-size: 16px">
        正在进行归档的任务
        {{ historyDownloadRecord.compressTask.length }}个
      </Tip>
      <Tip>详细归档记录点击右上角 “⏰查看下载历史”</Tip>
      <p
        v-for="(record, idx) in historyDownloadRecord.compressTask" :key="record.id" class="tc"
        style="margin-top: 10px"
      >
        {{ idx + 1 }}. {{ record.tip }}
        <span v-loading="true" element-loading-text="..." style="--el-loading-spinner-size: 20px" />
      </p>
    </div>
    <div v-show="showHistoryPanel" class="panel">
      <Tip style="font-size: 16px">
        ”❤️下面展示历史的下载记录与归档任务完成情况❤️“
      </Tip>
      <Tip>”再也不需要在页面停留等待归档完成“</Tip>
      <div>
        <el-table
          ref="multipleTable" v-loading="isLoadingData" element-loading-text="Loading..." tooltip-effect="dark"
          multiple-table stripe border :default-sort="{ prop: 'date', order: 'descending' }"
          :max-height="666" :data="historyDownloadRecord.actions" style="width: 100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column prop="date" label="触发时间" width="200">
            <template #default="scope">
              {{
                formatDate(new Date(scope.row.date))
              }}
            </template>
          </el-table-column>
          <el-table-column prop="tip" label="文件名" />
          <el-table-column prop="type" label="类型">
            <template #default="scope">
              <el-link v-if="scope.row.type === ActionType.Compress" type="primary">
                归档下载
              </el-link>
              <el-link v-else type="default">
                普通下载
              </el-link>
            </template>
          </el-table-column>
          <el-table-column prop="size" label="大小" width="100">
            <template #default="scope">
              <span v-if="scope.row.status === DownloadStatus.ARCHIVE"><el-link type="danger">归档中...</el-link></span>
              <span v-else-if="scope.row.status !== DownloadStatus.FAIL">{{
                !scope.row.size ? '未知大小' : formatSize(scope.row.size)
              }}</span>
              <span v-if="scope.row.status === DownloadStatus.FAIL"><el-link type="danger">归档失败</el-link></span>
            </template>
          </el-table-column>
          <el-table-column fixed="right" label="操作" width="140">
            <template #default="scope">
              <div v-if="scope.row.status === DownloadStatus.ARCHIVE" v-loading="true">
                归档中...
              </div>
              <div v-if="scope.row.status === DownloadStatus.EXPIRED">
                链接已失效
              </div>
              <div v-if="scope.row.status === DownloadStatus.FAIL">
                联系开发者，提供错误信息：{{ scope.row.error }}
              </div>
              <div v-if="scope.row.status === DownloadStatus.SUCCESS">
                <el-link type="primary" @click="downLoadByUrl(scope.row.url)">
                  下载
                </el-link>
                <el-link type="success" style="margin-left: 10px" @click="copyRes(scope.row.url)">
                  链接
                </el-link>
                <el-link
                  type="warning" style="margin-left: 10px" @click="() => {
                    showLinkModel = true
                    downloadUrl = scope.row.url
                  }
                  "
                >
                  二维码
                </el-link>
              </div>
            </template>
          </el-table-column>
        </el-table>
        <div class="flex fc">
          <el-pagination
            small :current-page="historyDownloadRecord.pageCurrent"
            :page-count="historyDownloadRecord.pageCount" :total="historyDownloadRecord.pageTotal"
            layout="total, prev, pager, next" @current-change="handleHistoryActionPageChange"
          />
        </div>
      </div>
    </div>
    <!-- 主体内容 -->
    <div class="panel">
      <Tip>全部文件大小：{{ fileListSize }}，当前任务大小：{{ filterFileSize }}</Tip>
      <Tip v-if="siteConfig.limitSpace">
        <span :class="{ warnColor: limitSpace }">{{ spaceUsageText }}</span>
      </Tip>
      <Tip v-if="siteConfig.limitWallet">
        <span :class="{ warnColor: limitWallet }">{{ moneyUsageText }}</span>
        <strong class="money-detail" @click="handleShowDetail">
          <span>查看详细</span>
        </strong>
      </Tip>
      <Tip v-if="limitDownload">
        <h2 style="color:#f56c6c">
          空间超限将无法上传/下载文件，如需要使用，请联系管理员扩容，或自行删除无关文件
        </h2>
      </Tip>
      <Tip>
        <strong>如果你觉得应用不错，<a
          style="color: #409eff" href="http://docs.ep.sugarat.top/praise/index.html" target="_blank"
          rel="noopener noreferrer"
        >给他发电⚡</a></strong>
        <strong v-if="isOpenPraise">，其它问题<a
          style="color: #409eff"
          href="https://docs.ep.sugarat.top/author.html#%E8%81%94%E7%B3%BB%E4%BD%9C%E8%80%85" target="_blank"
          rel="noopener noreferrer"
        >联系作者🔗</a></strong>
        <!-- <Praise>
          <el-button style="margin:0 0 2px;" size="small" type="primary" text>Go！Go！❓</el-button>
        </Praise> -->
      </Tip>
      <Tip v-if="isOpenPraise">
        <h3 style="color: #f56c6c">
          由于部分用户用量较大，小站无法承担这笔开销，限制每个账户为 2GB 可用空间，2￥的默认余额
        </h3>
        <h3>
          <span style="color: #f56c6c">你可以通过<a
            style="color: #409eff"
            href="https://docs.ep.sugarat.top/author.html#%E8%81%94%E7%B3%BB%E4%BD%9C%E8%80%85" target="_blank"
            rel="noopener noreferrer"
          > 联系作者进行赞助⚡ </a>增加空间 或 充值余额</span>，
          <strong>
            <a
              style="color: #409eff" href="https://docs.ep.sugarat.top/" target="_blank"
              rel="noopener noreferrer"
            >也可以选择自己搭建💡
            </a>
          </strong>
        </h3>
      </Tip>
      <el-table
        ref="multipleTable" v-loading="isLoadingData" element-loading-text="Loading..." tooltip-effect="dark"
        multiple-table stripe border :max-height="666" :data="showFilterFiles"
        style="width: 100%" @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="date" label="提交时间" width="160">
          <template #default="scope">
            {{
              formatDate(new Date(scope.row.date))
            }}
          </template>
        </el-table-column>
        <el-table-column prop="task_name" label="任务" width="150" />
        <el-table-column prop="name" label="文件名" width="200" />
        <template v-if="showOriginName">
          <el-table-column prop="origin_name" label="原文件名" width="200">
            <template #default="scope">
              {{ scope.row.origin_name || '-' }}
            </template>
          </el-table-column>
        </template>
        <el-table-column prop="size" label="大小">
          <template #default="scope">
            {{
              scope.row.size === 0 ? '未知大小' : formatSize(scope.row.size)
            }}
          </template>
        </el-table-column>
        <el-table-column prop="downloadCount" width="90" label="下载次数" />
        <template v-if="showImg">
          <el-table-column label="缩略图" width="120">
            <template #default="scope">
              <el-image
                preview-teleported :preview-src-list="previewImages" :initial-index="scope.$index"
                lazy style="width: 100px; height: 100px" :src="scope.row.cover" fit="cover"
                @switch="handleSwitchImage" @click="handleSwitchImage(scope.$index)"
              >
                <template #viewer>
                  <div class="imageDes">
                    {{ viewImageFilename }}
                  </div>
                </template>
                <template #placeholder>
                  <div class="imageLoading">
                    Loading...
                  </div>
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
          <el-table-column prop="people" width="100" label="限制名单">
            <template #default="scope">
              {{ scope.row.people || '-' }}
            </template>
          </el-table-column>
        </template>
        <el-table-column fixed="right" label="操作" width="140">
          <template #default="scope">
            <div class="text-btns">
              <el-button type="primary" text size="small" @click="checkInfo(scope.row)">
                查看提交信息
              </el-button>
              <el-button type="primary" text size="small" @click="rewriteFilename(scope.row)">
                修改文件名
              </el-button>
              <el-button type="primary" text size="small" @click="downloadOne(scope.row)">
                下载
              </el-button>
              <el-button type="primary" text size="small" @click="handleDelete(scope.row)">
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <!-- 分页 -->
    <div class="panel flex fc">
      <el-pagination
        :current-page="pageCurrent" background :page-count="pageCount" :page-sizes="[6, 10, 50, 100]"
        :page-size="pageSize" :total="filterFiles.length" layout="total, sizes, prev, pager, next, jumper" @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
    <!-- 信息弹窗 -->
    <el-dialog v-model="showInfoDialog" :fullscreen="isMobile" title="提交填写的信息">
      <InfosForm :infos="infos" :disabled="true" />
    </el-dialog>
    <LinkDialog v-model:value="showLinkModel" title="下载链接" :link="downloadUrl" />
    <el-dialog v-model="showRenameDialog" :fullscreen="isMobile" title="修改文件名">
      <div>
        <el-form label-width="100px" :model="renameForm">
          <el-form-item label="原文件名" prop="newName">
            <el-input v-model="renameForm.oldName" disabled />
          </el-form-item>
          <el-form-item label="新文件名" prop="newName">
            <el-input v-model="renameForm.newName" placeholder="请输入新文件名">
              <template #append>
                {{ renameForm.suffix }}
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="success" @click="handleSaveNewName">
              保存
            </el-button>
            <el-button @click="showRenameDialog = false">
              取消
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.warnColor {
  color: #f56c6c;
}
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

.control-item {
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

.imageDes {
  position: absolute;
  bottom: 80px;
  color: #fff;
  left: 50%;
  transform: translateX(-50%);
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
        color: #409eff;
      }
    }

    text-align: center;
  }
}
.money-detail {
  color: #409eff;
  cursor: pointer;
}
</style>
