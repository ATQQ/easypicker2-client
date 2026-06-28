<script lang="ts" setup>
import type { tableItem } from '@/utils/networkUtil'
import LinkDialog from '@components/linkDialog.vue'
import {
  ArrowDown,
  DataAnalysis,
  Download,
  Picture,
  QuestionFilled,
  Refresh,
  Search,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { ActionServiceAPI, FileApi } from '@/apis'
import FloatingContact from '@/components/FloatingContact/index.vue'
import InfosForm from '@/components/InfosForm/index.vue'
import { useAccountConfig, useIsMobile, useSiteConfig, useSpaceUsage } from '@/composables'
import { ActionType, DownloadStatus, filenamePattern } from '@/constants'
import { downLoadByUrl, tableToExcel } from '@/utils/networkUtil'
import {
  copyRes,
  formatDate,
  formatSize,
  getFileSuffix,
  normalizeFileName,
  parseInfo,
} from '@/utils/stringUtil'
import Tip from '../tasks/components/infoPanel/tip.vue'

const { value: siteConfig } = useSiteConfig('file-page')
useAccountConfig()
const isOpenPraise = computed(() => siteConfig.value.openPraise)
const showStorageLimit = computed(() => siteConfig.value.limitSpace)
const showWalletLimit = computed(() => siteConfig.value.limitWallet)
const showResourceLimitNotice = computed(
  () => isOpenPraise.value && (showStorageLimit.value || showWalletLimit.value),
)
const $store = useStore()
const $route = useRoute()
const $router = useRouter()

const {
  usage,
  size,
  wallet,
  cost,
  percentageValue,
  walletPercentageValue,
  percentage,
  limitDownload,
  limitSpace,
  limitWallet,
  priceText,
} = useSpaceUsage()

const showLinkModel = ref(false)
const downloadUrl = ref('')
const showImg = ref(localStorage.getItem('ep-show-images') !== 'false')
const showPeople = ref(true)
const showOriginName = ref(false)
const showHistoryPanel = ref(false)
const autoDownloadArchive = ref(localStorage.getItem('ep-auto-download-archive') !== 'false')
const autoDownloadTipText = '勾选后归档完成会自动触发下载；取消后请前往下载历史复制链接手动下载。'
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

const pendingArchiveActions = ref<any[]>([])
function pushPendingArchiveAction(tip: string) {
  const placeholder = {
    id: `pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: ActionType.Compress,
    status: DownloadStatus.ARCHIVE,
    tip,
    date: new Date(),
    size: 0,
    url: '',
    pending: true,
  }
  pendingArchiveActions.value.push(placeholder)
  mergePendingActions()
  showHistoryPanel.value = true
  return placeholder.id
}
function removePendingArchiveAction(id: string) {
  const idx = pendingArchiveActions.value.findIndex(v => v.id === id)
  if (idx !== -1) {
    pendingArchiveActions.value.splice(idx, 1)
  }
  mergePendingActions()
}
function mergePendingActions(actions: any[] = historyDownloadRecord.actions.filter((v: any) => !v.pending)) {
  historyDownloadRecord.actions = [
    ...pendingArchiveActions.value,
    ...actions,
  ]
}
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
    const haveArchive = actions.some(v => v.status === DownloadStatus.ARCHIVE)

    actions
      .filter(v => v.type === ActionType.Compress)
      .forEach((action) => {
        const existIndex = compressTask.findIndex(v => v.id === action.id)
        // 判断状态
        // SUCCESS
        //  存在，触发下载，从compressTask移除
        if (action.status === DownloadStatus.SUCCESS && existIndex !== -1) {
          if (autoDownloadArchive.value) {
            // 展示弹窗
            downloadUrl.value = action.url
            showLinkModel.value = true
            downLoadByUrl(action.url)
          }
          else {
            ElMessage.success({
              message: `归档任务 ${action.tip} 已完成，请到下载历史中复制链接`,
              duration: 5000,
            })
            showHistoryPanel.value = true
          }
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
    mergePendingActions(actions)
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
const selectCategory = ref(
  typeof $route.query.category === 'string' && $route.query.category
    ? $route.query.category
    : 'all',
)
// 任务相关
const tasks = computed<TaskApiTypes.TaskItem[]>(
  () => $store.state.task.taskList,
)
const selectTask = ref(
  typeof $route.query.task === 'string' && $route.query.task
    ? $route.query.task
    : 'all',
)
const filterTasks = computed(() => {
  if (selectCategory.value === 'all') {
    return tasks.value
  }
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

watchEffect(() => {
  if (selectCategory.value === 'all') {
    return
  }
  if (['default', 'no-task', 'trash'].includes(selectCategory.value)) {
    return
  }
  const list = categories.value
  if (list.length && !list.some((v: any) => v.k === selectCategory.value)) {
    selectCategory.value = 'all'
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
  const exportInfoCache = new Map<FileApiTypes.File, InfoItem[] | null>()
  function getExportInfo(file: FileApiTypes.File) {
    if (exportInfoCache.has(file)) {
      return exportInfoCache.get(file)
    }

    try {
      const rawInfo = file.info
      let info: InfoItem[]
      if (Array.isArray(rawInfo)) {
        info = parseInfo(rawInfo)
      }
      else if (rawInfo == null || String(rawInfo).trim() === '') {
        info = []
      }
      else {
        const parsed = JSON.parse(rawInfo)
        if (!Array.isArray(parsed)) {
          throw new TypeError('file info is not an array')
        }
        info = parseInfo(parsed)
      }
      exportInfoCache.set(file, info)
      return info
    }
    catch {
      ElMessage.error({
        message: `数据异常${file.name}，可联系平台管理员处理`,
        duration: 5000,
      })
      console.warn(file)
      exportInfoCache.set(file, null)
      return null
    }
  }

  const infosHeader = files.reduce<string[]>((pre, value) => {
    getExportInfo(value)?.forEach((i) => {
      if (i.text && !pre.includes(i.text)) {
        pre.push(i.text)
      }
    })
    return pre
  }, [])
  if (infosHeader.length) {
    headers.push({
      value: '提交信息',
      col: infosHeader.length,
    })
  }

  const body = files.map((v) => {
    const { date, task_name: taskName, name, size, people } = v
    const fileInfo = getExportInfo(v)
    if (!fileInfo) {
      return []
    }
    const infoObj = fileInfo.reduce<Record<string, string>>((pre, v) => {
      if (v.text) {
        pre[v.text] = `${v.value}`
      }
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
  }).filter(v => !!v.length)
  if (infosHeader.length) {
    body.unshift(infosHeader)
  }

  const _filename = filename || `数据导出_${formatDate(new Date(), 'yyyy年MM月dd日hh时mm分ss秒')}.xlsx`
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
const searchWord = ref('')
// 分页
const pageSize = ref(6)
// 当前页
const pageCurrent = ref(1)
const fileTotal = ref(0)
const filePageCount = ref(0)
const fileListTotalSize = ref(0)
const filterFileTotalSize = ref(0)
const EXPORT_PAGE_SIZE = 100
const exportAllMatchedRecords = computed(() =>
  selectTask.value !== 'all' || selectCategory.value !== 'all',
)
const exportTipText = computed(() =>
  exportAllMatchedRecords.value
    ? '已指定任务或分类：导出会自动分页拉取该范围内的全部匹配记录，单次接口最多100条。'
    : '未指定任务或分类：为避免一次导出全站大量记录，仅导出当前页列表；需要全量请先选择任务或分类。',
)
let loadFilesId = 0
function loadFiles() {
  const currentLoadId = ++loadFilesId
  isLoadingData.value = true
  files.splice(0, files.length)
  FileApi.getFilePage({
    pageIndex: pageCurrent.value,
    pageSize: pageSize.value,
    categoryKey: selectCategory.value,
    taskKey: selectTask.value,
    keyword: searchWord.value,
  })
    .then((res) => {
      if (currentLoadId !== loadFilesId) {
        return
      }
      const { data } = res
      files.push(...data.files)
      fileTotal.value = data.total
      filePageCount.value = data.pageCount
      fileListTotalSize.value = data.totalSize
      filterFileTotalSize.value = data.filterSize
    })
    .finally(() => {
      if (currentLoadId === loadFilesId) {
        isLoadingData.value = false
      }
    })
}
async function loadFilesForExport() {
  if (!exportAllMatchedRecords.value) {
    return [...files]
  }
  const exportFiles: FileApiTypes.File[] = []
  let pageIndex = 1
  let pageCount = 1
  do {
    const { data } = await FileApi.getFilePage({
      pageIndex,
      pageSize: EXPORT_PAGE_SIZE,
      categoryKey: selectCategory.value,
      taskKey: selectTask.value,
      keyword: searchWord.value,
    })
    exportFiles.push(...data.files)
    pageCount = data.pageCount
    pageIndex += 1
  } while (pageIndex <= pageCount)
  return exportFiles
}
async function handleExportFilterFiles() {
  const exportFiles = await loadFilesForExport()
  handleExportExcel(
    exportFiles,
    `筛选数据导出_${formatDate(
      new Date(),
      'yyyy年MM月dd日hh时mm分ss秒',
    )}.xlsx`,
  )
}
const multipleTable: any = ref()

const showFilterFiles = computed(() => files)

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
      {
        const zipName = `批量下载_${formatDate(new Date(), 'yyyy年MM月dd日hh时mm分ss秒')}`
        const pendingId = pushPendingArchiveAction(`${zipName}.zip 归档中（${ids.length}个文件）`)
        FileApi.batchDownload(ids, zipName)
          .then((res) => {
            if (res.data?.message) {
              ElMessage.info(res.data.message)
            }
            if (res.data?.url) {
              downloadUrl.value = res.data.url
              showLinkModel.value = true
              if (autoDownloadArchive.value) {
                downLoadByUrl(res.data.url)
              }
            }
            loadActions()
          })
          .catch(() => {
            ElMessage.error('所选文件均已从服务器上移除')
            batchDownStart.value = false
          })
          .finally(() => {
            removePendingArchiveAction(pendingId)
          })
      }
      showHistoryPanel.value = true
      ElMessage.info('开始归档选中的文件,请耐心等待')
      break
    case 'delete':
      if (selectItem.length === 0) {
        ElMessage.warning('没有选中需要删除的内容')
        return
      }
      ElMessageBox.confirm('删除后无法恢复，是否删除', '数据无价，请谨慎操作')
        .then(() => {
          FileApi.batchDel(ids).then(() => {
            ElMessage.success('删除成功')
            if (files.length === ids.length && pageCurrent.value > 1) {
              pageCurrent.value -= 1
              return
            }
            loadFiles()
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
        `批量导出_${formatDate(new Date(), 'yyyy年MM月dd日hh时mm分ss秒')}.xlsx`,
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
      if (file) {
        file.name = `${renameForm.newName}${renameForm.suffix}`
      }
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
        loadFiles()
      }, 1000)
    })
    .catch(() => {
      ElMessage.error('文件已从服务器上移除')
    })
}
function copyOneFileLink(e: any) {
  if (limitDownload.value) {
    ElMessage.error('下载功能已被限制，请联系管理员扩容，或自行删除历史无用文件')
    return
  }
  const { id } = e
  FileApi.getOneFileUrl(id)
    .then((res) => {
      const { link } = res.data
      copyRes(link, '下载链接已复制到剪贴板')
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
        fileTotal.value -= 1
        if (files.length === 0 && pageCurrent.value > 1) {
          pageCurrent.value -= 1
          return
        }
        loadFiles()
      })
    })
    .catch(() => {
      ElMessage.info('取消删除')
    })
}

function handleSizeChange(v: number) {
  pageSize.value = v
  pageCurrent.value = 1
}

const filterFileSize = computed(() =>
  formatSize(filterFileTotalSize.value),
)
const fileListSize = computed(() =>
  formatSize(fileListTotalSize.value),
)
const storageProgressPercentage = computed(() => Math.min(100, percentageValue.value))
const walletProgressPercentage = computed(() => Math.min(100, walletPercentageValue.value))
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
  if (fileTotal.value === 0) {
    ElMessage.warning('该任务中没有数据')
    return
  }
  if (batchDownStart.value) {
    ElMessage.warning('已经有批量下载任务正在进行,请稍后再试')
    return
  }
  batchDownStart.value = true
  const pendingId = pushPendingArchiveAction(`${selectTaskName.value || '任务'}.zip 归档中`)
  FileApi.batchDownloadByQuery({
    taskKey: selectTask.value,
    zipName: selectTaskName.value,
  })
    .then((res) => {
      if (res.data?.message) {
        ElMessage.info(res.data.message)
      }
      if (res.data?.url) {
        downloadUrl.value = res.data.url
        showLinkModel.value = true
        if (autoDownloadArchive.value) {
          downLoadByUrl(res.data.url)
        }
      }
      loadActions()
    })
    .catch(() => {
      ElMessage.error('所选任务中的文件均已从服务器上移除')
    })
    .finally(() => {
      removePendingArchiveAction(pendingId)
      setTimeout(() => {
        batchDownStart.value = false
      }, 1000)
    })
  showHistoryPanel.value = true
  ElMessage.info('开始归档选中的文件,请耐心等待')
}

const viewImageFilename = ref('')

const previewImages = computed(() => {
  return showFilterFiles.value.map(v => v.preview || '')
})

function handleSwitchImage(idx: number) {
  viewImageFilename.value = showFilterFiles.value[idx].name
}

function reloadFirstPage() {
  if (pageCurrent.value === 1) {
    loadFiles()
    return
  }
  pageCurrent.value = 1
}

function loadTaskOptions() {
  if (selectCategory.value === 'all') {
    return $store.dispatch('task/getTask', { recent: false })
  }
  return $store.dispatch('task/getTaskByCategory', {
    category: selectCategory.value,
    recent: false,
  })
}

watch([selectCategory, selectTask, searchWord], reloadFirstPage)
watch(selectCategory, () => {
  selectTask.value = 'all'
  loadTaskOptions()
})
watch([selectCategory, selectTask], ([category, task]) => {
  const nextQuery: Record<string, any> = { ...$route.query }
  if (category && category !== 'all') {
    nextQuery.category = category
  }
  else {
    delete nextQuery.category
  }
  if (task && task !== 'all') {
    nextQuery.task = task
  }
  else {
    delete nextQuery.task
  }
  if (
    nextQuery.category === $route.query.category
    && nextQuery.task === $route.query.task
  ) {
    return
  }
  $router.replace({ query: nextQuery })
})
watch([pageCurrent, pageSize], loadFiles)
watch(showImg, () => {
  window.localStorage.setItem('ep-show-images', `${showImg.value}`)
})
watch(autoDownloadArchive, () => {
  window.localStorage.setItem('ep-auto-download-archive', `${autoDownloadArchive.value}`)
})

onMounted(() => {
  loadFiles()
  loadActions()
  loadTaskOptions()
  $store.dispatch('category/getCategory')
})

const isMobile = useIsMobile()
function handleShowDetail() {
  ElMessageBox.confirm(priceText.value)
}
</script>

<template>
  <div class="files">
    <div v-if="isOpenPraise" class="top-notice">
      <div class="top-notice-main">
        <strong>{{ siteConfig.filePagePraiseText }}<a
          :href="siteConfig.filePagePraiseLink" target="_blank"
          rel="noopener noreferrer"
        >{{ siteConfig.filePagePraiseLinkText }}</a></strong>
        <strong>{{ siteConfig.filePageContactText }}<a
          :href="siteConfig.filePageContactLink" target="_blank"
          rel="noopener noreferrer"
        >{{ siteConfig.filePageContactLinkText }}</a></strong>
      </div>
      <div v-if="showResourceLimitNotice" class="top-notice-detail">
        <span>{{ siteConfig.filePageLimitText }}</span>
        <span>{{ siteConfig.filePageSponsorText }}<a
          :href="siteConfig.filePageSponsorLink" target="_blank"
          rel="noopener noreferrer"
        >{{ siteConfig.filePageSponsorLinkText }}</a>{{ siteConfig.filePageSponsorSuffix }}</span>
        <span>
          <a
            :href="siteConfig.filePageSelfHostLink" target="_blank"
            rel="noopener noreferrer"
          >{{ siteConfig.filePageSelfHostLinkText }}</a>
        </span>
      </div>
    </div>
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
        <el-checkbox v-model="autoDownloadArchive" class="auto-download-checkbox" size="default">
          归档完成后自动下载
        </el-checkbox>
        <el-tooltip :content="autoDownloadTipText" placement="top" effect="dark">
          <el-icon class="export-help-icon">
            <QuestionFilled />
          </el-icon>
        </el-tooltip>
      </div>
      <div class="item search-item">
        <el-input v-model="searchWord" size="default" clearable placeholder="请输入要检索的内容" :prefix-icon="Search" />
        <div class="search-tip">
          可搜索：文件名、任务名、提交人姓名、原文件名、提交信息
        </div>
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
          :title="exportTipText" type="success" size="default" :icon="DataAnalysis"
          :disabled="fileTotal === 0" @click="handleExportFilterFiles"
        >
          导出记录
        </el-button>
        <el-tooltip :content="exportTipText" placement="top" effect="dark">
          <el-icon class="export-help-icon">
            <QuestionFilled />
          </el-icon>
        </el-tooltip>
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
      <div class="stats-dashboard">
        <div class="stat-card">
          <span class="stat-label">全部文件</span>
          <strong>{{ fileListSize }}</strong>
          <small>当前账号提交文件总大小</small>
        </div>
        <div class="stat-card">
          <span class="stat-label">当前筛选</span>
          <strong>{{ filterFileSize }}</strong>
          <small>当前筛选条件下文件大小</small>
        </div>
        <div v-if="showStorageLimit" class="stat-card" :class="{ warning: limitSpace }">
          <span class="stat-label">存储空间</span>
          <strong>{{ formatSize(usage) }} / {{ formatSize(size) }}</strong>
          <el-progress :percentage="storageProgressPercentage" :status="limitSpace ? 'exception' : undefined" />
          <small>{{ percentage }} 已使用</small>
        </div>
        <div v-if="showWalletLimit" class="stat-card" :class="{ warning: limitWallet }">
          <span class="stat-label">钱包消耗</span>
          <strong>{{ cost }} / {{ wallet }}￥</strong>
          <el-progress :percentage="walletProgressPercentage" :status="limitWallet ? 'exception' : undefined" />
          <small>统计时间：{{ formatDate(siteConfig.moneyStartDay, 'yyyy-MM-dd') }} - 至今</small>
          <button class="stat-link" type="button" @click="handleShowDetail">
            查看费用明细
          </button>
        </div>
      </div>
      <Tip v-if="limitDownload">
        <h2 style="color:#f56c6c">
          空间超限将无法上传/下载文件，如需要使用，请联系管理员扩容，或自行删除无关文件
        </h2>
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
        <el-table-column fixed="right" label="操作" width="160">
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
              <el-button type="primary" text size="small" @click="copyOneFileLink(scope.row)">
                复制链接
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
        :current-page="pageCurrent" background :page-count="filePageCount" :page-sizes="[6, 10, 50, 100]"
        :page-size="pageSize" :total="fileTotal" layout="total, sizes, prev, pager, next, jumper" @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
    <!-- 信息弹窗 -->
    <el-dialog v-model="showInfoDialog" :fullscreen="isMobile" title="提交填写的信息">
      <InfosForm :infos="infos" :disabled="true" />
    </el-dialog>
    <LinkDialog v-model:value="showLinkModel" title="下载链接" :link="downloadUrl" />
    <FloatingContact
      v-if="siteConfig.filePageFloatingContactEnabled && siteConfig.filePageContactLink"
      :href="siteConfig.filePageContactLink"
      :text="siteConfig.filePageContactLinkText || '联系客服'"
    />
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
.files {
  width: min(1440px, calc(100vw - 48px));
  max-width: 1440px;
  margin: 0 auto;
  padding-bottom: 2em;
}

.top-notice {
  padding: 14px 18px;
  border: 1px solid rgb(64 158 255 / 18%);
  border-radius: 14px;
  margin: 10px auto;
  background:
    radial-gradient(circle at 96% 12%, rgb(64 158 255 / 16%), transparent 24%),
    linear-gradient(135deg, #fff 0%, #f7faff 100%);
  box-shadow: 0 8px 22px rgb(31 41 55 / 6%);
  color: #334155;
  font-size: 14px;
  line-height: 1.7;

  a {
    color: #409eff;
  }
}

.top-notice-detail {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin-top: 4px;
  color: #f56c6c;
  font-weight: 700;
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

.search-item {
  min-width: 260px;
}

.search-tip {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
}

.stats-dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  min-height: 120px;
  padding: 16px;
  border: 1px solid #edf0f5;
  border-radius: 14px;
  background:
    radial-gradient(circle at 90% 16%, rgb(64 158 255 / 14%), transparent 28%),
    linear-gradient(135deg, #fff 0%, #f7faff 100%);
  box-shadow: 0 8px 22px rgb(31 41 55 / 6%);
  box-sizing: border-box;

  &.warning {
    border-color: rgb(245 108 108 / 38%);
    background:
      radial-gradient(circle at 90% 16%, rgb(245 108 108 / 14%), transparent 28%),
      linear-gradient(135deg, #fff 0%, #fff8f8 100%);
  }

  strong {
    margin: 8px 0 6px;
    color: #1f2937;
    font-size: 22px;
    line-height: 1.25;
  }

  small {
    color: #8a94a6;
    line-height: 1.5;
  }

  :deep(.el-progress) {
    margin: 4px 0 2px;
  }
}

.stat-label {
  color: #409eff;
  font-size: 13px;
  font-weight: 700;
}

.stat-link {
  align-self: flex-start;
  padding: 0;
  border: 0;
  margin-top: 8px;
  background: transparent;
  color: #409eff;
  cursor: pointer;
  font-size: 13px;
}

.export-help-icon {
  align-items: center;
  color: #909399;
  cursor: help;
  display: inline-flex;
  font-size: 16px;
  height: 32px;
  margin-left: 10px;
  margin-bottom: 10px;
}

.auto-download-checkbox {
  margin-left: 10px;
  margin-bottom: 10px;
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
</style>
