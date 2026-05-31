<script lang="ts" setup>
import { View } from '@element-plus/icons-vue'
import { BarChart, LineChart } from 'echarts/charts'
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed, onMounted, reactive, ref } from 'vue'
import VChart from 'vue-echarts'
import { SuperOverviewApi } from '@/apis'
import { formatDate } from '@/utils/stringUtil'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
])

const methods = ['', 'GET', 'POST', 'PUT', 'DELETE']
const metricKeys = [
  { key: 'tp9999', label: 'TP9999', color: '#8e44ad' },
  { key: 'tp999', label: 'TP999', color: '#e67e22' },
  { key: 'tp99', label: 'TP99', color: '#f4516c' },
  { key: 'tp95', label: 'TP95', color: '#36a3f7' },
  { key: 'avg', label: 'AVG', color: '#34bfa3' },
] as const
type MetricKey = typeof metricKeys[number]['key']
interface MonitorMetricsData {
  startTime: number
  endTime: number
  bucketMs: number
  pv: {
    total: number
    uv: number
    series: OverviewApiTypes.MonitorCountMetricItem[]
    top: OverviewApiTypes.MonitorTopItem[]
  }
  error: {
    total: number
    affectedIp: number
    series: OverviewApiTypes.MonitorCountMetricItem[]
    top: OverviewApiTypes.MonitorTopItem[]
  }
}
interface RequestStatusMetricsData {
  startTime: number
  endTime: number
  total: number
  non200Total: number
  codes: OverviewApiTypes.RequestStatusCodeMetric[]
}

const now = Date.now()
const filters = reactive({
  range: [now - 1000 * 60 * 60 * 12, now] as [number, number],
  method: '',
  path: '',
})
const isLoading = ref(false)
const total = ref(0)
const series = ref<OverviewApiTypes.RequestMetricItem[]>([])
const groups = ref<OverviewApiTypes.RequestMetricGroup[]>([])
const pathOptions = ref<OverviewApiTypes.RequestMetricPathOption[]>([])
const selectedMetric = ref<MetricKey>('avg')
const monitorMetrics = ref<MonitorMetricsData>({
  startTime: filters.range[0],
  endTime: filters.range[1],
  bucketMs: 1000 * 60 * 30,
  pv: {
    total: 0,
    uv: 0,
    series: [],
    top: [],
  },
  error: {
    total: 0,
    affectedIp: 0,
    series: [],
    top: [],
  },
})
const statusMetrics = ref<RequestStatusMetricsData>({
  startTime: filters.range[0],
  endTime: filters.range[1],
  total: 0,
  non200Total: 0,
  codes: [],
})
const statusLogs = ref<OverviewApiTypes.RequestStatusLogItem[]>([])
const statusLogsTotal = ref(0)
const statusFilters = reactive({
  non200Only: true,
  statusCode: '' as number | '' | null | undefined,
  pageSize: 10,
  pageIndex: 1,
})
const isLoadingStatusLogs = ref(false)
const showRequestDetail = ref(false)
const requestDetailData = ref({})

const filteredPathOptions = computed(() => {
  return pathOptions.value
})

const isEndpointMode = computed(() => !filters.path)

const activeMetricLabel = computed(() => {
  return metricKeys.find(item => item.key === selectedMetric.value)?.label || 'AVG'
})

const chartTitle = computed(() => {
  if (isEndpointMode.value) {
    return `接口耗时看板 - ${activeMetricLabel.value}`
  }
  return `接口耗时看板 - ${filters.path}`
})

const chartOption = computed(() => {
  if (isEndpointMode.value) {
    return {
      tooltip: {
        trigger: 'axis',
        valueFormatter: formatDuration,
      },
      legend: {
        top: 0,
        type: 'scroll',
      },
      grid: {
        top: 50,
        left: 54,
        right: 24,
        bottom: 58,
      },
      dataZoom: [
        { type: 'inside' },
        { type: 'slider', height: 20, bottom: 18 },
      ],
      xAxis: {
        type: 'category',
        data: series.value.map(item => formatXAxis(item.time)),
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: formatDuration,
        },
      },
      series: groups.value.map(group => ({
        name: group.label,
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: group.series.map(item => item[selectedMetric.value]),
      })),
    }
  }

  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: formatDuration,
    },
    legend: {
      top: 0,
    },
    grid: {
      top: 50,
      left: 54,
      right: 24,
      bottom: 58,
    },
    dataZoom: [
      { type: 'inside' },
      { type: 'slider', height: 20, bottom: 18 },
    ],
    xAxis: {
      type: 'category',
      data: series.value.map(item => formatXAxis(item.time)),
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: formatDuration,
      },
    },
    series: metricKeys.map(metric => ({
      name: metric.label,
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: series.value.map(item => item[metric.key]),
      itemStyle: { color: metric.color },
    })),
  }
})

const monitorCards = computed(() => [
  {
    title: '接口请求',
    value: total.value,
    desc: '当前筛选范围内的接口请求数',
    className: 'api',
  },
  {
    title: '页面访问',
    value: monitorMetrics.value.pv.total,
    desc: `UV ${monitorMetrics.value.pv.uv}`,
    className: 'pv',
  },
  {
    title: '服务端报错',
    value: monitorMetrics.value.error.total,
    desc: `影响 IP ${monitorMetrics.value.error.affectedIp}`,
    className: 'error',
  },
])

const pvChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
  },
  legend: {
    top: 0,
  },
  grid: {
    top: 42,
    left: 46,
    right: 20,
    bottom: 34,
  },
  xAxis: {
    type: 'category',
    data: monitorMetrics.value.pv.series.map(item => formatXAxis(item.time)),
  },
  yAxis: {
    type: 'value',
  },
  series: [
    {
      name: 'PV',
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: monitorMetrics.value.pv.series.map(item => item.count),
      itemStyle: { color: '#409eff' },
    },
    {
      name: 'UV',
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: monitorMetrics.value.pv.series.map(item => item.uv),
      itemStyle: { color: '#67c23a' },
    },
  ],
}))

const errorChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
  },
  grid: {
    top: 24,
    left: 46,
    right: 20,
    bottom: 34,
  },
  xAxis: {
    type: 'category',
    data: monitorMetrics.value.error.series.map(item => formatXAxis(item.time)),
  },
  yAxis: {
    type: 'value',
  },
  series: [
    {
      name: '服务端报错',
      type: 'bar',
      barMaxWidth: 28,
      data: monitorMetrics.value.error.series.map(item => item.count),
      itemStyle: { color: '#f56c6c' },
    },
  ],
}))

const pageTopChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow',
    },
  },
  grid: {
    top: 8,
    left: 110,
    right: 18,
    bottom: 24,
  },
  xAxis: {
    type: 'value',
  },
  yAxis: {
    type: 'category',
    inverse: true,
    data: monitorMetrics.value.pv.top.map(item => item.path),
  },
  series: [
    {
      name: '访问次数',
      type: 'bar',
      barMaxWidth: 18,
      data: monitorMetrics.value.pv.top.map(item => item.count),
      itemStyle: { color: '#36a3f7' },
    },
  ],
}))

const statusCodeOptions = computed(() => {
  return statusMetrics.value.codes.filter(item => item.code)
})

const statusCodeChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow',
    },
    formatter(params: any[]) {
      const item = params[0]
      const source = statusMetrics.value.codes[item.dataIndex]
      return `${source.label}<br/>次数：${source.count}<br/>占比：${source.percent}%`
    },
  },
  grid: {
    top: 18,
    left: 46,
    right: 20,
    bottom: 34,
  },
  xAxis: {
    type: 'category',
    data: statusMetrics.value.codes.map(item => item.label),
  },
  yAxis: {
    type: 'value',
  },
  series: [
    {
      name: '状态码',
      type: 'bar',
      barMaxWidth: 34,
      data: statusMetrics.value.codes.map(item => item.count),
      itemStyle: {
        color(params: any) {
          const code = statusMetrics.value.codes[params.dataIndex]?.code || 0
          return getStatusColor(code)
        },
      },
    },
  ],
}))

const tableData = computed(() => {
  return groups.value
    .flatMap(group =>
      group.series.map(item => ({
        ...item,
        group: group.label,
      })),
    )
    .sort((a, b) => b.time - a.time)
})

function formatXAxis(time: number) {
  return formatDate(new Date(time), 'MM-dd hh:mm')
}

function formatDuration(ms: number) {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`
  }
  return `${ms}ms`
}

function formatStatusCode(code: number) {
  return code ? String(code) : '未知'
}

function getStatusColor(code: number) {
  if (code === 200) {
    return '#67c23a'
  }
  if (code >= 500) {
    return '#f56c6c'
  }
  if (code >= 400) {
    return '#e6a23c'
  }
  if (code >= 300) {
    return '#909399'
  }
  return '#409eff'
}

function getStatusTagType(code: number) {
  if (code === 200) {
    return 'success'
  }
  if (code >= 500) {
    return 'danger'
  }
  if (code >= 400) {
    return 'warning'
  }
  return 'info'
}

function getMetricOptions() {
  return {
    startTime: Number(filters.range?.[0]),
    endTime: Number(filters.range?.[1]),
    method: filters.method,
    path: filters.path,
  }
}

function getStatusLogOptions(options = getMetricOptions()) {
  const statusCode = typeof statusFilters.statusCode === 'number' && Number.isFinite(statusFilters.statusCode)
    ? statusFilters.statusCode
    : undefined
  return {
    ...options,
    statusCode,
    non200Only: statusCode === undefined ? statusFilters.non200Only : false,
    pageSize: statusFilters.pageSize,
    pageIndex: statusFilters.pageIndex,
  }
}

function loadRequestStatusLogs(options = getMetricOptions()) {
  isLoadingStatusLogs.value = true
  return SuperOverviewApi.getRequestStatusLogs(getStatusLogOptions(options))
    .then((res) => {
      statusLogs.value = res.data.logs
      statusLogsTotal.value = res.data.sum
    })
    .finally(() => {
      isLoadingStatusLogs.value = false
    })
}

function loadMetrics() {
  isLoading.value = true
  const options = getMetricOptions()
  Promise.all([
    SuperOverviewApi.getRequestMetrics(options),
    SuperOverviewApi.getMonitorMetrics({
      startTime: options.startTime,
      endTime: options.endTime,
    }),
    SuperOverviewApi.getRequestStatusMetrics(options),
    SuperOverviewApi.getRequestStatusLogs(getStatusLogOptions(options)),
  ])
    .then((res) => {
      const [requestRes, monitorRes, statusMetricRes, statusLogRes] = res
      series.value = requestRes.data.series
      groups.value = requestRes.data.groups || []
      pathOptions.value = requestRes.data.paths || []
      total.value = requestRes.data.total
      monitorMetrics.value = monitorRes.data
      statusMetrics.value = statusMetricRes.data
      statusLogs.value = statusLogRes.data.logs
      statusLogsTotal.value = statusLogRes.data.sum
    })
    .finally(() => {
      isLoading.value = false
    })
}

function handleMethodChange() {
  filters.path = ''
  statusFilters.pageIndex = 1
}

function handleQuery() {
  statusFilters.pageIndex = 1
  loadMetrics()
}

function handleStatusFilterChange() {
  statusFilters.pageIndex = 1
  loadRequestStatusLogs()
}

function handleStatusPageChange(pageIndex: number) {
  statusFilters.pageIndex = pageIndex
  loadRequestStatusLogs()
}

function handleStatusSizeChange(pageSize: number) {
  statusFilters.pageSize = pageSize
  statusFilters.pageIndex = 1
  loadRequestStatusLogs()
}

function handleRequestDetail(row: OverviewApiTypes.RequestStatusLogItem) {
  SuperOverviewApi.getLogMsgDetail(row.id).then((res) => {
    const data = res.data || {}
    showRequestDetail.value = true
    requestDetailData.value = {
      context: {
        method: data.method,
        url: data.url,
        path: data.path,
        statusCode: data.statusCode,
        duration: data.duration,
        ip: data.ip,
        userId: data.userId,
        userAgent: data.userAgent,
        refer: data.refer,
        startTime: data.startTime,
        endTime: data.endTime,
      },
      request: {
        query: data.query,
        params: data.params,
        body: data.body,
      },
      response: data.response,
    }
  })
}

onMounted(() => {
  loadMetrics()
})
</script>

<template>
  <div class="metrics">
    <div class="panel">
      <div class="toolbar">
        <el-date-picker
          v-model="filters.range"
          type="datetimerange"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          range-separator="至"
          value-format="x"
          size="default"
        />
        <el-select
          v-model="filters.method"
          placeholder="请求方法"
          size="default"
          class="method-select"
          @change="handleMethodChange"
        >
          <el-option
            v-for="method in methods"
            :key="method || 'all'"
            :label="method || '全部方法'"
            :value="method"
          />
        </el-select>
        <el-select
          v-model="filters.path"
          placeholder="请求 Path（可选）"
          class="path-select"
          clearable
          filterable
          size="default"
        >
          <el-option
            v-for="item in filteredPathOptions"
            :key="`${item.method}-${item.value}`"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select
          v-if="isEndpointMode"
          v-model="selectedMetric"
          size="default"
          class="metric-select"
          placeholder="指标"
        >
          <el-option
            v-for="metric in metricKeys"
            :key="metric.key"
            :label="metric.label"
            :value="metric.key"
          />
        </el-select>
        <el-button type="primary" size="default" @click="handleQuery">
          查询
        </el-button>
      </div>

      <div v-loading="isLoading" element-loading-text="正在加载指标…" class="chart-card">
        <div class="monitor-cards">
          <div
            v-for="card in monitorCards"
            :key="card.title"
            class="monitor-card"
            :class="card.className"
          >
            <span>{{ card.title }}</span>
            <strong>{{ card.value }}</strong>
            <small>{{ card.desc }}</small>
          </div>
        </div>

        <div class="monitor-grid">
          <section class="monitor-panel wide">
            <div class="panel-title">
              页面访问趋势
            </div>
            <VChart class="small-chart" :option="pvChartOption" autoresize />
          </section>
          <section class="monitor-panel">
            <div class="panel-title">
              服务端报错趋势
            </div>
            <VChart class="small-chart" :option="errorChartOption" autoresize />
          </section>
          <section class="monitor-panel">
            <div class="panel-title">
              热门访问页面
            </div>
            <VChart class="small-chart" :option="pageTopChartOption" autoresize />
          </section>
          <section class="monitor-panel">
            <div class="panel-title">
              高频服务端报错
            </div>
            <el-table
              :data="monitorMetrics.error.top"
              size="small"
              border
              height="260"
              empty-text="暂无服务端报错"
            >
              <el-table-column prop="path" label="接口" min-width="120" show-overflow-tooltip />
              <el-table-column prop="msg" label="错误" min-width="160" show-overflow-tooltip />
              <el-table-column prop="count" label="次数" width="70" />
            </el-table>
          </section>
        </div>

        <section class="status-section">
          <div class="status-header">
            <div>
              <div class="panel-title">
                接口状态码
              </div>
            </div>
            <div class="status-summary">
              <span>总请求 {{ statusMetrics.total }}</span>
              <span class="danger">非 200 {{ statusMetrics.non200Total }}</span>
            </div>
          </div>
          <div class="status-content">
            <VChart class="status-chart" :option="statusCodeChartOption" autoresize />
            <div class="status-log-panel">
              <div class="status-log-toolbar">
                <el-checkbox
                  v-model="statusFilters.non200Only"
                  :disabled="statusFilters.statusCode !== '' && statusFilters.statusCode !== undefined && statusFilters.statusCode !== null"
                  @change="handleStatusFilterChange"
                >
                  仅看非 200
                </el-checkbox>
                <el-select
                  v-model="statusFilters.statusCode"
                  clearable
                  filterable
                  size="default"
                  class="status-select"
                  placeholder="状态码"
                  @change="handleStatusFilterChange"
                >
                  <el-option
                    v-for="item in statusCodeOptions"
                    :key="item.code"
                    :label="`${item.label} (${item.count})`"
                    :value="item.code"
                  />
                </el-select>
              </div>
              <el-table
                v-loading="isLoadingStatusLogs"
                :data="statusLogs"
                size="small"
                border
                stripe
                height="320"
                empty-text="暂无状态码日志"
              >
                <el-table-column prop="date" label="时间" width="150">
                  <template #default="scope">
                    {{ formatDate(new Date(scope.row.date), 'MM-dd hh:mm:ss') }}
                  </template>
                </el-table-column>
                <el-table-column prop="statusCode" label="状态" width="82">
                  <template #default="scope">
                    <el-tag size="small" :type="getStatusTagType(scope.row.statusCode)">
                      {{ formatStatusCode(scope.row.statusCode) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="method" label="方法" width="82" />
                <el-table-column prop="path" label="接口" min-width="180" show-overflow-tooltip />
                <el-table-column prop="duration" label="耗时" width="84">
                  <template #default="scope">
                    {{ formatDuration(scope.row.duration) }}
                  </template>
                </el-table-column>
                <el-table-column prop="ip" label="IP" min-width="110" show-overflow-tooltip />
                <el-table-column fixed="right" label="操作" width="110">
                  <template #default="scope">
                    <el-button
                      text
                      type="primary"
                      size="small"
                      :icon="View"
                      @click="handleRequestDetail(scope.row)"
                    >
                      上下文
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
              <div class="status-pagination">
                <el-pagination
                  small
                  background
                  :current-page="statusFilters.pageIndex"
                  :page-size="statusFilters.pageSize"
                  :total="statusLogsTotal"
                  :page-sizes="[10, 20, 50, 100]"
                  layout="total, sizes, prev, pager, next"
                  @current-change="handleStatusPageChange"
                  @size-change="handleStatusSizeChange"
                />
              </div>
            </div>
          </div>
        </section>

        <div class="summary">
          <div>
            <div class="title">
              {{ chartTitle }}
            </div>
            <div class="desc">
              默认展示近 12 小时请求日志；未选择 Path 时按「全部接口 + method/path」分组展示，可切换指标。
            </div>
          </div>
          <div class="total">
            请求数：{{ total }}
          </div>
        </div>

        <VChart class="chart" :option="chartOption" autoresize />

        <el-table :data="tableData" border stripe size="small" height="520" class="data-table">
          <el-table-column prop="time" label="时间" min-width="150">
            <template #default="scope">
              {{ formatDate(new Date(scope.row.time)) }}
            </template>
          </el-table-column>
          <el-table-column prop="group" label="接口" min-width="220" show-overflow-tooltip />
          <el-table-column prop="count" label="请求数" width="90" />
          <el-table-column prop="tp9999" label="TP9999" width="100" />
          <el-table-column prop="tp999" label="TP999" width="100" />
          <el-table-column prop="tp99" label="TP99" width="100" />
          <el-table-column prop="tp95" label="TP95" width="100" />
          <el-table-column prop="avg" label="AVG" width="100" />
        </el-table>
      </div>
    </div>
    <el-dialog
      v-model="showRequestDetail"
      title="接口上下文"
      width="60%"
    >
      <json-viewer
        :value="requestDetailData"
        :expand-depth="5"
        copyable
        boxed
        sort
      />
      <template #footer>
        <span class="dialog-footer">
          <el-button type="primary" @click="showRequestDetail = false">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.metrics {
  margin: 0 auto;
  width: 100%;
}

.panel {
  width: 100%;
  max-width: 1480px;
  min-width: 0;
  padding: 1em;
  background-color: #fff;
  margin: 10px auto;
  box-sizing: border-box;
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);
  border-radius: 4px;
}

.toolbar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.method-select {
  width: 130px;
}

.path-select {
  width: 360px;
}

.metric-select {
  width: 110px;
}

.chart-card {
  min-height: 420px;
  overflow: hidden;
}

.monitor-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.monitor-card {
  display: grid;
  gap: 6px;
  padding: 16px;
  border-radius: 14px;
  background: #f7faff;
  border: 1px solid #e8edf5;

  span {
    color: #606266;
    font-size: 14px;
  }

  strong {
    color: #303133;
    font-size: 28px;
    line-height: 1;
  }

  small {
    color: #909399;
  }

  &.api {
    background: linear-gradient(135deg, #f7faff 0%, #edf5ff 100%);
  }

  &.pv {
    background: linear-gradient(135deg, #f4fbf6 0%, #ecf9f0 100%);
  }

  &.error {
    background: linear-gradient(135deg, #fff7f7 0%, #fff0f0 100%);
  }
}

.monitor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.monitor-panel {
  min-width: 0;
  padding: 14px;
  border: 1px solid #e8edf5;
  border-radius: 12px;
  background: #fff;

  &.wide {
    grid-column: span 2;
  }
}

.panel-title {
  margin-bottom: 8px;
  color: #303133;
  font-weight: 700;
}

.small-chart {
  width: 100%;
  height: 260px;
}

.status-section {
  min-width: 0;
  margin-bottom: 18px;
  padding: 14px;
  border: 1px solid #e8edf5;
  border-radius: 8px;
  background: #fff;
}

.status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.status-summary {
  display: flex;
  gap: 12px;
  color: #606266;
  font-size: 13px;

  .danger {
    color: #f56c6c;
  }
}

.status-content {
  display: grid;
  grid-template-columns: minmax(260px, 0.8fr) minmax(0, 1.2fr);
  gap: 12px;
}

.status-chart {
  width: 100%;
  height: 360px;
}

.status-log-panel {
  min-width: 0;
}

.status-log-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.status-select {
  width: 150px;
}

.status-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.summary {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}

.title {
  font-weight: 700;
  font-size: 18px;
  color: #333;
}

.desc {
  margin-top: 4px;
  color: #888;
  font-size: 12px;
}

.total {
  color: #666;
  font-size: 13px;
}

.chart {
  width: 100%;
  height: 460px;
}

.data-table {
  margin-top: 12px;
}

@media screen and (max-width: 900px) {
  .monitor-cards,
  .monitor-grid,
  .status-content {
    grid-template-columns: 1fr;
  }

  .monitor-panel.wide {
    grid-column: auto;
  }
}

@media screen and (max-width: 700px) {
  .toolbar > * {
    width: 100% !important;
  }

  .summary {
    display: block;
  }

  .status-header,
  .status-log-toolbar,
  .status-pagination {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
