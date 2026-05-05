<script lang="ts" setup>
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

function loadMetrics() {
  isLoading.value = true
  const options = {
    startTime: Number(filters.range?.[0]),
    endTime: Number(filters.range?.[1]),
    method: filters.method,
    path: filters.path,
  }
  Promise.all([
    SuperOverviewApi.getRequestMetrics(options),
    SuperOverviewApi.getMonitorMetrics({
      startTime: options.startTime,
      endTime: options.endTime,
    }),
  ])
    .then((res) => {
      const [requestRes, monitorRes] = res
      series.value = requestRes.data.series
      groups.value = requestRes.data.groups || []
      pathOptions.value = requestRes.data.paths || []
      total.value = requestRes.data.total
      monitorMetrics.value = monitorRes.data
    })
    .finally(() => {
      isLoading.value = false
    })
}

function handleMethodChange() {
  filters.path = ''
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
        <el-button type="primary" size="default" @click="loadMetrics">
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
  .monitor-grid {
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
}
</style>
