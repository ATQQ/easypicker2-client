<script lang="ts" setup>
import { LineChart } from 'echarts/charts'
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
  SuperOverviewApi.getRequestMetrics({
    startTime: Number(filters.range?.[0]),
    endTime: Number(filters.range?.[1]),
    method: filters.method,
    path: filters.path,
  })
    .then((res) => {
      series.value = res.data.series
      groups.value = res.data.groups || []
      pathOptions.value = res.data.paths || []
      total.value = res.data.total
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
</style>
