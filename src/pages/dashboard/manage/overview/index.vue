<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watchEffect } from 'vue'
import {
  Coin,
  DataAnalysis,
  DataBoard,
  Document,
  Refresh,
  Search,
  TakeawayBox,
  Tickets,
  User,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { SuperOverviewApi } from '@/apis'
import { copyRes, formatDate } from '@/utils/stringUtil'
import { tableToExcel } from '@/utils/networkUtil'
import { debounce } from '@/utils/other'
import { useIsMobile } from '@/composables'

const isMobile = useIsMobile()

const isLoadingOverview = ref(false)
const cardList = reactive([
  {
    type: 'user',
    title: '用户数量',
    value: '0',
    supplement: '较昨日 +0',
    icon: User,
    color: '#40c9c6',
  },
  {
    type: 'file',
    title: '记录/OSS',
    value: '0',
    supplement: '记录较昨日 +0',
    icon: Document,
    color: '#36a3f7',
  },
  {
    type: 'log',
    title: '日志数量',
    value: '0',
    supplement: '较昨日 +0',
    icon: Tickets,
    color: '#f4516c',
  },
  {
    type: 'pv',
    title: 'PV/UV',
    value: '0/0',
    supplement: '',
    icon: DataBoard,
    color: '#34bfa3',
  },
  {
    type: 'compress',
    title: '归档&无效文件',
    value: '0/0KB',
    supplement: '已失效0个',
    icon: Coin,
    color: '#e38013',
  },
])
// 刷新记录条数
function refreshCount() {
  isLoadingOverview.value = true
  SuperOverviewApi.getCount().then((res) => {
    const { user, file, log, pv, compress } = res.data
    cardList[0].value = `${user.sum}`
    cardList[0].supplement = `较昨日 +${user.recent}`
    cardList[1].value = `${file.server.sum}/${file.oss.sum} (${file.oss.size})`
    cardList[1].supplement = `记录较昨日 +${file.server.recent}`
    cardList[2].value = `${log.sum}`
    cardList[2].supplement = `较昨日 +${log.recent}`
    cardList[3].value = `${pv.today.sum}/${pv.today.uv}`
    cardList[3].supplement = `历史: ${pv.all.sum}/${pv.all.uv}`
    cardList[4].value = `${compress.all.sum}/${compress.all.size}`
    cardList[4].supplement = `已失效 ${compress.expired.sum}/${compress.expired.size}`
    isLoadingOverview.value = false
  })
}

const disableDelete = ref(false)
function clearExpiredCompressFile() {
  disableDelete.value = true
  SuperOverviewApi.clearExpiredCompressFile().then(() => {
    setTimeout(() => {
      ElMessage.success('清理成功，数据同步可能有延迟')
      disableDelete.value = false
      refreshCount()
    }, 2000)
  })
}

// 日志
const logs: any[] = reactive([])

// function getLogsTypeText(type: string) {
//   const logsTypeText: any = {
//     request: '网络请求',
//     behavior: '用户行为',
//     error: '错误',
//     pv: '页面访问',
//   }
//   return logsTypeText[type]
// }
// 筛选的日志
const filterLogType = ref('behavior')
const searchWord = ref('')
const logTypeList = reactive([
  {
    label: '用户行为',
    type: 'behavior',
  },
  {
    label: '网络请求',
    type: 'request',
  },
  {
    label: '服务端错误',
    type: 'error',
  },
  {
    label: '页面访问',
    type: 'pv',
  },
])

// 分页
// 页大小
const pageSize = ref(10)
function handleSizeChange(v: number) {
  pageSize.value = v
}
// 总条数
const logSumCount = ref(0)
const pageCount = computed(() => {
  const t = Math.ceil(logSumCount.value / pageSize.value)
  return t
})
const pageCurrent = ref(1)
function handlePageChange(idx: number) {
  pageCurrent.value = idx
}

const refreshLogs = debounce(
  () => {
    SuperOverviewApi.getLogMsg(
      pageSize.value,
      pageCurrent.value,
      filterLogType.value,
      searchWord.value,
    ).then((res) => {
      logs.splice(0, logs.length)
      logs.push(...res.data.logs)
      logSumCount.value = res.data.sum
    })
  },
  100,
  false,
)

watchEffect(() => {
  if (filterLogType.value) {
    pageCurrent.value = 1
  }
})

watchEffect(() => {
  if (searchWord.value !== undefined) {
    refreshLogs()
  }
})

watchEffect(() => {
  if (filterLogType.value) {
    refreshLogs()
  }
})

watchEffect(() => {
  if (pageCurrent.value || pageSize.value) {
    refreshLogs()
  }
})

const showDetail = ref(false)
const showData = ref('')
function handleDetail(id) {
  SuperOverviewApi.getLogMsgDetail(id).then((res) => {
    showDetail.value = true
    showData.value = JSON.stringify(res.data, null, 2)
  })
}
const jsonData = computed(() => {
  try {
    return JSON.parse(showData.value)
  }
  catch (e) {
    return {}
  }
})
function handleCopyDetail() {
  copyRes(showData.value)
}

function exportLogData() {
  if (logs.length === 0) {
    return
  }
  const headers = ['日期', 'IP', '内容']
  const body = logs.map((v) => {
    const { date, ip, msg } = v
    return [formatDate(new Date(date)), ip, msg]
  })
  tableToExcel(
    headers,
    body,
    `导出日志_${logs.length}条${formatDate(
      new Date(),
      'yyyy年MM月dd日hh时mm分ss秒',
    )}.xlsx`,
  )
  ElMessage.success('导出成功')
}
onMounted(() => {
  refreshCount()
})
</script>

<template>
  <div class="overview">
    <div
      v-loading="isLoadingOverview"
      class="card-list"
      element-loading-text="Loading..."
    >
      <div v-for="c in cardList" :key="c.type" class="card">
        <div class="logo">
          <el-icon :color="c.color">
            <component :is="c.icon" />
          </el-icon>
        </div>
        <div class="content">
          <div class="title">
            {{ c.title }}
          </div>
          <div class="text">
            {{ c.value }}
          </div>
          <div class="supplement">
            {{ c.supplement }}
          </div>
        </div>
      </div>
    </div>
    <div class="panel">
      <div class="p10 log-filter">
        <span class="item">
          <span class="label">类型</span>
          <el-select
            v-model="filterLogType"
            size="default"
            placeholder="请选择日志类型"
          >
            <el-option
              v-for="(item, idx) in logTypeList"
              :key="idx"
              :label="item.label"
              :value="item.type"
            />
          </el-select>
        </span>
        <span class="item">
          <el-input
            v-model="searchWord"
            size="default"
            clearable
            placeholder="请输入要检索的内容"
            :prefix-icon="Search"
          />
        </span>
        <span class="item">
          <el-button size="default" :icon="Refresh" @click="refreshLogs">刷新</el-button>
        </span>
        <span class="item">
          <el-button
            size="default"
            type="primary"
            :icon="DataAnalysis"
            @click="exportLogData"
          >导出日志 {{ logs.length }} 条</el-button>
        </span>
        <span class="item">
          <el-button
            v-loading="disableDelete"
            size="default"
            type="danger"
            :icon="TakeawayBox"
            :disabled="disableDelete"
            @click="clearExpiredCompressFile"
          >清理无效文件</el-button>
        </span>
      </div>
      <el-table
        tooltip-effect="dark"
        height="400"
        stripe
        border
        :default-sort="{ prop: 'date', order: 'descending' }"
        :data="logs"
        style="width: 100%"
      >
        <el-table-column sortable prop="date" label="日期" width="180">
          <template #default="scope">
            {{
              formatDate(new Date(scope.row.date))
            }}
          </template>
        </el-table-column>
        <!-- <el-table-column prop="type" label="类型" width="100">
          <template #default="scope">{{ getLogsTypeText(scope.row.type) }}</template>
        </el-table-column> -->
        <el-table-column
          sortable
          prop="ip"
          label="IP"
          width="100"
        />
        <el-table-column
          min-width="160"
          prop="msg"
          label="内容"
        />
        <el-table-column fixed="right" label="操作" width="100">
          <template #default="scope">
            <el-button
              type="primary"
              text
              size="small"
              @click="handleDetail(scope.row.id)"
            >
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="flex fc p10">
        <el-pagination
          :current-page="pageCurrent"
          background
          :page-count="pageCount"
          :page-sizes="[10, 50, 100, 200, 500, 1000]"
          :page-size="pageSize"
          :total="logSumCount"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </div>
    <el-dialog
      v-model="showDetail"
      title="详细信息"
      width="50%"
      center
      :fullscreen="isMobile"
    >
      <json-viewer
        :value="jsonData"
        :expand-depth="5"
        copyable
        boxed
        sort
      />
      <template #footer>
        <span class="dialog-footer">
          <el-button type="default" @click="handleCopyDetail">复制</el-button>
          <el-button type="primary" @click="showDetail = false">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
@media screen and (max-width: 700px) {
  .card-list {
    margin-top: 40px;
  }

  .card {
    min-width: 300px;
  }

  .log-filter {
    justify-content: center;
  }
}

.overview {
  margin: 0 auto;
}

.card-list {
  display: flex;
  margin-top: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

.card {
  margin: 10px;
  cursor: pointer;
  font-size: 12px;
  position: relative;
  overflow: hidden;
  color: #666;
  background: #fff;
  box-shadow: 4px 4px 40px rgb(0 0 0 / 5%);
  border-color: rgba(0, 0, 0, 0.05);
  min-width: 300px;

  .logo {
    float: left;
    margin: 4px 10px 0 10px;
    -webkit-transition: all 0.38s ease-out;
    transition: all 0.38s ease-out;
    border-radius: 6px;
    font-size: 48px;

    i {
      padding: 10px;
    }
  }

  .content {
    float: right;
    font-weight: 700;
    margin: 10px;
    margin-left: 0;

    .title {
      line-height: 18px;
      color: rgba(0, 0, 0, 0.45);
      font-size: 14px;
      text-align: right;
    }

    .text {
      font-size: 16px;
      text-align: right;
    }

    .supplement {
      font-size: 12px;
      font-weight: lighter;
      text-align: right;
    }
  }
}

.panel {
  max-width: 1024px;
  padding: 1em;
  background-color: #fff;
  margin: 10px auto;
  box-sizing: border-box;
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);
  border-radius: 4px;
}

.log-filter {
  display: flex;
  flex-wrap: wrap;

  .item {
    margin-right: 10px;
    margin-bottom: 10px;

    .label {
      margin-right: 10px;
      font-size: 12px;
    }
  }
}
</style>
