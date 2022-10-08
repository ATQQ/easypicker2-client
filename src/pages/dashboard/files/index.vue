<template>
  <div class="files">
    <!-- 筛选框 -->
    <div class="panel header">
      <div class="item">
        <span class="label">分类</span>
        <!--TODO: multiple 多选待评估 -->
        <el-select
          size="default"
          v-model="selectCategory"
          filterable
          placeholder="请选择"
        >
          <el-option label="全部" value="all" />
          <el-option label="默认" value="default" />
          <el-option
            v-for="item in categories"
            :key="item.k"
            :label="item.name"
            :value="item.k"
          />
          <el-option label="无关联任务" value="no-task" />
        </el-select>
      </div>
      <div class="item">
        <span class="label">任务</span>
        <el-select
          size="default"
          v-model="selectTask"
          filterable
          placeholder="请选择"
        >
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
        <el-button
          :loading="batchDownStart"
          :disabled="selectTask === 'all'"
          type="primary"
          size="default"
          :icon="Download"
          @click="handleDownloadTask"
          >下载任务中的文件</el-button
        >
      </div>
      <div class="item">
        <el-input
          size="default"
          clearable
          placeholder="请输入要检索的内容"
          :prefix-icon="Search"
          v-model="searchWord"
        >
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
              <el-dropdown-item
                :disabled="selectItem.length === 0"
                command="download"
                >下载</el-dropdown-item
              >
              <el-dropdown-item
                :disabled="selectItem.length === 0"
                command="delete"
                >删除</el-dropdown-item
              >
              <el-dropdown-item
                :disabled="selectItem.length === 0"
                command="excel"
                >导出记录</el-dropdown-item
              >
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <div v-show="false">
          <!-- 迷惑的解决bug的手段 -->
          <el-dropdown trigger="click" @command="handleDropdownClick">
            <el-button
              type="primary"
              :disabled="selectItem.length === 0"
              size="default"
            >
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
        <el-button size="default" :icon="Refresh" @click="handleRefresh"
          >刷新</el-button
        >
        <el-button
          title="导出表格中所有的数据"
          type="success"
          size="default"
          :icon="DataAnalysis"
          @click="
            () => {
              handleExportExcel(
                filterFiles,
                `筛选数据导出_${formatDate(
                  new Date(),
                  'yyyy年MM月日hh时mm分ss秒'
                )}.xlsx`
              )
            }
          "
          :disabled="showFilterFiles.length === 0"
          >导出记录</el-button
        >
        <div class="control-item">
          显示图片
          <el-switch
            inline-prompt
            v-model="showImg"
            active-color="#13ce66"
            inactive-color="#ff4949"
            active-text="是"
            inactive-text="否"
          />
        </div>
        <div class="control-item">
          展示原文件名
          <el-switch
            inline-prompt
            v-model="showOriginName"
            active-color="#13ce66"
            inactive-color="#ff4949"
            active-text="是"
            inactive-text="否"
          />
        </div>
        <div class="control-item">
          显示提交人姓名
          <el-switch
            inline-prompt
            v-model="showPeople"
            active-color="#13ce66"
            inactive-color="#ff4949"
            active-text="是"
            inactive-text="否"
          />
        </div>
        <div class="control-item">
          ⏰ 查看下载历史
          <el-switch
            v-model="showHistoryPanel"
            style="
              --el-switch-on-color: #13ce66;
              --el-switch-off-color: #ff4949;
            "
          />
        </div>
      </div>
    </div>
    <!-- 主体内容 -->
    <div class="panel">
      <Tip>空间占用情况：{{ filterFileSize }} / {{ fileListSize }}</Tip>
      <Tip>↑ 仅供使用者参考，应用无存储空间上限，也不收费</Tip>
      <Tip
        ><strong
          >如果你觉得应用不错，<a
            style="color: #409eff"
            href="http://docs.ep.sugarat.top/praise/index.html"
            target="_blank"
            rel="noopener noreferrer"
            >请作者喝茶 🍵</a
          ></strong
        >
        <!-- <Praise>
          <el-button style="margin:0 0 2px;" size="small" type="primary" text>Go！Go！❓</el-button>
        </Praise> -->
      </Tip>
      <el-table
        v-loading="isLoadingData"
        element-loading-text="Loading..."
        tooltip-effect="dark"
        multipleTable
        ref="multipleTable"
        @selection-change="handleSelectionChange"
        stripe
        border
        :default-sort="{ prop: 'date', order: 'descending' }"
        :max-height="666"
        :data="showFilterFiles"
        style="width: 100%"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column sortable prop="date" label="提交时间" width="200">
          <template #default="scope">{{
            formatDate(new Date(scope.row.date))
          }}</template>
        </el-table-column>
        <el-table-column
          prop="task_name"
          label="任务"
          width="150"
        ></el-table-column>
        <el-table-column
          sortable
          prop="name"
          label="文件名"
          width="200"
        ></el-table-column>
        <template v-if="showOriginName">
          <el-table-column
            sortable
            prop="origin_name"
            label="原文件名"
            width="200"
          >
            <template #default="scope">
              {{ scope.row.origin_name || '-' }}
            </template>
          </el-table-column>
        </template>
        <el-table-column prop="size" label="大小">
          <template #default="scope">{{
            scope.row.size === 0 ? '未知大小' : formatSize(scope.row.size)
          }}</template>
        </el-table-column>
        <template v-if="showImg">
          <el-table-column label="缩略图" width="120">
            <template #default="scope">
              <el-image
                preview-teleported
                :preview-src-list="previewImages"
                :initial-index="scope.$index"
                lazy
                style="width: 100px; height: 100px"
                :src="scope.row.cover"
                fit="cover"
              >
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
              <el-button
                @click="checkInfo(scope.row)"
                type="primary"
                text
                size="small"
                >查看提交信息</el-button
              >
              <el-button
                @click="rewriteFilename(scope.row)"
                type="primary"
                text
                size="small"
                >修改文件名</el-button
              >
              <el-button
                @click="downloadOne(scope.row)"
                type="primary"
                text
                size="small"
                >下载</el-button
              >
              <el-button
                @click="handleDelete(scope.row)"
                type="primary"
                text
                size="small"
                >删除</el-button
              >
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <!-- 分页 -->
    <div class="panel flex fc">
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
    <div class="panel" v-show="showHistoryPanel">
      <tip style="font-size: 16px"
        >”❤️下面展示历史的下载记录与归档任务完成情况❤️“</tip
      >
      <tip style="font-size: 16px">”再也不需要在页面停留等待归档完成“</tip>
      <div>
        <el-table
          v-loading="isLoadingData"
          element-loading-text="Loading..."
          tooltip-effect="dark"
          multipleTable
          ref="multipleTable"
          @selection-change="handleSelectionChange"
          stripe
          border
          :default-sort="{ prop: 'date', order: 'descending' }"
          :max-height="666"
          :data="historyDownloadRecord.actions"
          style="width: 100%"
        >
          <el-table-column prop="date" label="触发时间" width="200">
            <template #default="scope">{{
              formatDate(new Date(scope.row.date))
            }}</template>
          </el-table-column>
          <el-table-column prop="tip" label="文件信息"></el-table-column>
          <el-table-column prop="type" label="任务类型">
            <template #default="scope">
              <el-link
                v-if="scope.row.type === ActionType.Compress"
                type="primary"
                >归档下载</el-link
              >
              <el-link v-else type="default">普通下载</el-link>
            </template>
          </el-table-column>
          <el-table-column prop="size" label="大小" width="100">
            <template #default="scope">
              <span v-if="scope.row.status === DownloadStatus.ARCHIVE"
                ><el-link type="danger">归档中...</el-link></span
              >
              <span v-else>{{
                !scope.row.size ? '未知大小' : formatSize(scope.row.size)
              }}</span>
            </template>
          </el-table-column>
          <el-table-column fixed="right" label="操作" width="140">
            <template #default="scope">
              <div
                v-loading="true"
                v-if="scope.row.status === DownloadStatus.ARCHIVE"
              >
                归档中...
              </div>
              <div v-if="scope.row.status === DownloadStatus.EXPIRED">
                链接已失效
              </div>
              <div v-if="scope.row.status === DownloadStatus.SUCCESS">
                <el-link @click="downLoadByUrl(scope.row.url)" type="primary"
                  >下载</el-link
                >
                <el-link
                  type="success"
                  style="margin-left: 10px"
                  @click="copyRes(scope.row.url)"
                  >链接</el-link
                >
                <el-link
                  type="warning"
                  style="margin-left: 10px"
                  @click="
                    () => {
                      showLinkModel = true
                      downloadUrl = scope.row.url
                    }
                  "
                  >二维码</el-link
                >
              </div>
            </template>
          </el-table-column>
        </el-table>
        <div class="flex fc">
          <el-pagination
            small
            :current-page="historyDownloadRecord.pageCurrent"
            :page-count="historyDownloadRecord.pageCount"
            :total="historyDownloadRecord.pageTotal"
            layout="total, prev, pager, next"
            @current-change="handleHistoryActionPageChange"
          ></el-pagination>
        </div>
      </div>
    </div>
    <!-- 信息弹窗 -->
    <el-dialog
      :fullscreen="isMobile"
      title="提交填写的信息"
      v-model="showInfoDialog"
    >
      <InfosForm :infos="infos" :disabled="true" />
    </el-dialog>
    <LinkDialog
      v-model:value="showLinkModel"
      title="下载链接"
      :link="downloadUrl"
    ></LinkDialog>
    <el-dialog
      :fullscreen="isMobile"
      title="修改文件名"
      v-model="showRenameDialog"
    >
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
            <el-button type="success" @click="handleSaveNewName"
              >保存</el-button
            >
            <el-button @click="showRenameDialog = false">取消</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-dialog>
  </div>
</template>
<script lang="ts" setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref, watchEffect } from 'vue'
import { useStore } from 'vuex'
import LinkDialog from '@components/linkDialog.vue'
import {
  ArrowDown,
  Refresh,
  DataAnalysis,
  Download,
  Search,
  Picture
} from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'
import {
  copyRes,
  formatDate,
  formatSize,
  getFileSuffix,
  parseInfo
} from '@/utils/stringUtil'
import { ActionServiceAPI, FileApi } from '@/apis'
import { downLoadByUrl, tableItem, tableToExcel } from '@/utils/networkUtil'
import Tip from '../tasks/components/infoPanel/tip.vue'
import InfosForm from '@/components/InfosForm/index.vue'
import { DownloadStatus, ActionType } from '@/constants'

const $store = useStore()
const $route = useRoute()
const showLinkModel = ref(false)
const downloadUrl = ref('')
const showImg = ref(false)
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
  pageTotal: 0
})

const loadActions = () => {
  ActionServiceAPI.getDownloadActions(
    historyDownloadRecord.pageSize,
    historyDownloadRecord.pageCurrent
  ).then((v) => {
    const { actions, sum } = v.data
    const haveArchive = !!actions.find(
      (v) => v.status === DownloadStatus.ARCHIVE
    )

    // 已记录的task
    const compressTask: string[] = JSON.parse(
      localStorage.getItem('ep_compress_task') || '[]'
    )
    actions
      .filter((v) => v.type === ActionType.Compress)
      .forEach((action) => {
        // 判断状态
        // SUCCESS
        //  存在，触发下载，从compressTask移除
        // Archive
        //  不存在，push进compressTask
      })

    // TODO:更新用于展示的数据
    localStorage.setItem('ep_compress_task', JSON.stringify(compressTask))
    if (haveArchive) {
      // 递归查询
      setTimeout(loadActions, 1000)
    }
    historyDownloadRecord.pageTotal = sum
    historyDownloadRecord.actions = actions
    historyDownloadRecord.pageCount = Math.ceil(
      sum / historyDownloadRecord.pageSize
    )
  })
}
const handleHistoryActionPageChange = (v) => {
  historyDownloadRecord.pageCurrent = v
  loadActions()
}
// 记录导出
const handleExportExcel = (files: FileApiTypes.File[], filename?: string) => {
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
  const headers: (string | tableItem)[] = baseHeaders.map((v) => ({
    value: v,
    row: 2
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
    col: infosHeader.length
  })

  const body = files.map((v) => {
    const { date, task_name: taskName, name, size, people } = v
    const infoObj = JSON.parse(v.info).reduce((pre, v) => {
      pre[v.text] = v.value
      return pre
    }, {})
    const info = infosHeader.map((v) => infoObj[v] ?? '-')
    const rows = [formatDate(new Date(date)), taskName, name, formatSize(size)]
    if (showOriginName.value) {
      rows.push(v.origin_name || '-')
    }
    if (showPeople.value) {
      rows.push(people || '-')
    }
    rows.push(...info)
    return rows
  })
  body.unshift(infosHeader)
  tableToExcel(
    headers,
    body,
    filename ||
      `数据导出_${formatDate(new Date(), 'yyyy年MM月日hh时mm分ss秒')}.xlsx`
  )
  ElMessage.success('导出成功')
}
// 分类相关
const categories = computed(() => $store.state.category.categoryList)
const selectCategory = ref('all')
// 任务相关
const tasks = computed<TaskApiTypes.TaskItem[]>(
  () => $store.state.task.taskList
)
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

watchEffect(() => {
  if (
    tasks.value.length &&
    tasks.value.some((v) => v.key === $route.query.task)
  ) {
    selectTask.value = `${$route.query.task}`
  }
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
const filterFiles = computed(() =>
  files
    .filter((f) => {
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
    })
    .filter((t) =>
      searchWord.value
        ? JSON.stringify([
            formatDate(new Date(t.date)),
            formatSize(t.size),
            t.people,
            t.name,
            t.task_name,
            // eslint-disable-next-line no-useless-escape
            t.info
          ])
            .replace(/[:'"{},[\]]/g, '')
            .includes(searchWord.value)
        : true
    )
)

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
      FileApi.batchDownload(
        ids,
        `批量下载_${formatDate(new Date(), 'yyyy年MM月日hh时mm分ss秒')}`
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
              ...files.filter((v) => !ids.includes(v.id))
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
        `批量导出_${formatDate(new Date(), 'yyyy年MM月日hh时mm分ss秒')}.xlsx`
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
const checkInfo = (e: any) => {
  infos.splice(0, infos.length)
  infos.push(...parseInfo(e.info))
  showInfoDialog.value = true
}

const showRenameDialog = ref(false)
const renameForm = reactive({
  oldName: '',
  newName: '',
  suffix: '',
  id: -1
})
const rewriteFilename = (e: any) => {
  const { id, name } = e
  const suffix = getFileSuffix(name)
  renameForm.oldName = name
  renameForm.suffix = suffix
  renameForm.id = id
  showRenameDialog.value = true
}

const handleSaveNewName = () => {
  FileApi.updateFilename(
    renameForm.id,
    `${renameForm.newName}${renameForm.suffix}`
  )
    .then(() => {
      ElMessage.success('修改成功')
      const file = files.find((v) => v.id === renameForm.id)
      file.name = `${renameForm.newName}${renameForm.suffix}`
    })
    .catch(() => {
      ElMessage.error('修改失败')
    })
    .finally(() => {
      showRenameDialog.value = false
    })
}

const downloadOne = (e: any) => {
  const { id, name } = e
  FileApi.getOneFileUrl(id)
    .then((res) => {
      const { link } = res.data
      showLinkModel.value = true
      downloadUrl.value = link
      downLoadByUrl(link, name)
      // 刷新
      loadActions()
    })
    .catch(() => {
      ElMessage.error('文件已从服务器上移除')
    })
}
const handleDelete = (e: any) => {
  const idx = files.findIndex((v) => v === e)
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
  const end = pageCurrent.value * pageSize.value
  return filterFiles.value.slice(start, end)
})

const filterFileSize = computed(() =>
  formatSize(filterFiles.value.reduce((acc, cur) => acc + cur.size, 0))
)
const fileListSize = computed(() =>
  formatSize(files.reduce((acc, cur) => acc + cur.size, 0))
)
const handlePageChange = (idx: number) => {
  pageCurrent.value = idx
}

// 刷新文件列表

const handleRefresh = () => {
  ElMessage.success({
    message: '刷新成功'
  })
  loadFiles()
}
const handleDownloadTask = () => {
  const ids: number[] = files
    .filter((f) => f.task_key === selectTask.value)
    .map((v) => v.id)
  if (ids.length === 0) {
    ElMessage.warning('该任务中没有数据')
    return
  }
  if (batchDownStart.value) {
    ElMessage.warning('已经有批量下载任务正在进行,请稍后再试')
    return
  }
  FileApi.batchDownload(ids, selectTaskName.value)
    .then(() => {
      loadActions()
    })
    .catch(() => {
      ElMessage.error('所选任务中的文件均已从服务器上移除')
      batchDownStart.value = false
    })
  ElMessage.info('开始归档选中的文件,请赖心等待')
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
  loadActions()
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
