<template>
  <div class="overview">
    <div class="card-list">
      <div v-for="c in cardList" :key="c.type" class="card">
        <div class="logo">
          <i :style="{ color: c.color }" :class="c.icon"></i>
        </div>
        <div class="content">
          <div class="title">{{ c.title }}</div>
          <div class="text">{{ c.value }}</div>
          <div class="supplement">{{ c.supplement }}</div>
        </div>
      </div>
    </div>
    <div class="panel">
      <div class="p10 log-filter">
        <span class="item">
          <span class="label">类型</span>
          <el-select v-model="filterLogType" size="default" placeholder="请选择日志类型">
            <el-option
              v-for="(item,idx) in logTypeList"
              :key="idx"
              :label="item.label"
              :value="item.type"
            ></el-option>
          </el-select>
        </span>
        <span class="item">
          <el-input
            size="default"
            clearable
            placeholder="请输入要检索的内容"
            prefix-icon="el-icon-search"
            v-model="searchWord"
          ></el-input>
        </span>
        <span class="item">
          <el-button size="default" icon="el-icon-refresh" @click="refreshLogs">刷新</el-button>
        </span>
      </div>
      <el-table
        tooltip-effect="dark"
        height="400"
        stripe
        border
        :default-sort="{ prop: 'date', order: 'descending' }"
        :data="pageLogs"
        style="width: 100%;"
      >
        <el-table-column sortable prop="date" label="日期" width="180">
          <template #default="scope">{{ formatDate(new Date(scope.row.date)) }}</template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="100">
          <template #default="scope">{{ getLogsTypeText(scope.row.type) }}</template>
        </el-table-column>
        <el-table-column sortable prop="ip" label="地址"></el-table-column>
        <el-table-column fixed="right" width="160" prop="msg" label="内容"></el-table-column>
      </el-table>

      <div class="tc p10">
        <el-pagination
          :current-page="pageCurrent"
          @current-change="handlePageChange"
          background
          :page-count="pageCount"
          :page-sizes="[10, 50, 100, 200]"
          :page-size="pageSize"
          @size-change="handleSizeChange"
          :total="filterLogs.length"
          layout="total, sizes, prev, pager, next, jumper"
        ></el-pagination>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { ElMessage } from 'element-plus'
import {
  computed, defineComponent, onMounted, reactive, ref,
} from 'vue'
import { SuperOverviewApi } from '@/apis'
import { formatDate } from '@/utils/stringUtil'

export default defineComponent({
  setup() {
    const cardList = reactive([
      {
        type: 'user',
        title: '用户数量',
        value: '0',
        supplement: '较昨日 +10',
        icon: 'el-icon-user',
        color: '#40c9c6',
      },
      {
        type: 'file',
        title: '文件数量',
        value: '0',
        supplement: '较昨日 +10',
        icon: 'el-icon-document',
        color: '#36a3f7',
      },
      {
        type: 'log',
        title: '日志数量',
        value: '0',
        supplement: '较昨日 +10',
        icon: 'el-icon-tickets',
        color: '#f4516c',
      },
      {
        type: 'pv',
        title: 'PV/UV',
        value: '0/0',
        supplement: '',
        icon: 'el-icon-s-data',
        color: '#34bfa3',
      },
    ])
    // 刷新记录条数
    const refreshCount = () => {
      SuperOverviewApi.getCount().then((res) => {
        const {
          user, file, log, pv,
        } = res.data
        cardList[0].value = user.sum
        cardList[0].supplement = `较昨日 +${user.recent}`
        cardList[1].value = file.sum
        cardList[1].supplement = `较昨日 +${file.recent}`
        cardList[2].value = log.sum
        cardList[2].supplement = `较昨日 +${log.recent}`
        cardList[3].value = `${pv.today.sum}/${pv.today.uv}`
        cardList[3].supplement = `历史: ${pv.all.sum}/${pv.all.uv}`
      })
    }

    // 日志
    const logs: any[] = reactive([])
    const refreshLogs = () => {
      ElMessage.success('抓取日志数据成功')
      SuperOverviewApi.getAllLogMsg().then((res) => {
        logs.splice(0, logs.length)
        const d = res.data.logs
        logs.push(...d)
      })
    }

    function getLogsTypeText(type: string) {
      const logsTypeText: any = {
        request: '网络请求',
        behavior: '用户行为',
        error: '错误',
        pv: '页面访问',
      }
      return logsTypeText[type]
    }
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
      }, {
        label: '服务端错误',
        type: 'error',
      },
      {
        label: '页面访问',
        type: 'pv',
      },
    ])

    const filterLogs = computed(() => logs
      .filter((v) => v.type === filterLogType.value)
      .filter((v) => {
        const { date, ip, msg } = v
        if (searchWord.value.length === 0) return true
        return `${date} ${ip} ${msg}`.includes(searchWord.value)
      }))
    // 分页
    const pageSize = ref(10)
    const handleSizeChange = (v: number) => {
      pageSize.value = v
    }
    const pageCount = computed(() => {
      const t = Math.ceil(filterLogs.value.length / pageSize.value)
      return t
    })
    const pageCurrent = ref(1)
    const pageLogs = computed(() => {
      const start = (pageCurrent.value - 1) * pageSize.value
      const end = (pageCurrent.value) * pageSize.value
      return filterLogs.value.slice(start, end)
    })
    const handlePageChange = (idx: number) => {
      pageCurrent.value = idx
    }
    onMounted(() => {
      refreshCount()
      refreshLogs()
    })
    return {
      cardList,
      logs,
      filterLogs,
      formatDate,
      getLogsTypeText,
      pageSize,
      handleSizeChange,
      pageCount,
      pageLogs,
      handlePageChange,
      pageCurrent,
      filterLogType,
      logTypeList,
      searchWord,
      refreshLogs,
    }
  },
})
</script>

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
  height: 108px;
  cursor: pointer;
  font-size: 12px;
  position: relative;
  overflow: hidden;
  color: #666;
  background: #fff;
  box-shadow: 4px 4px 40px rgb(0 0 0 / 5%);
  border-color: rgba(0, 0, 0, 0.05);
  width: 260px;
  .logo {
    float: left;
    margin: 16px 10px 0 10px;
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
    margin: 26px;
    margin-left: 0;
    .title {
      line-height: 18px;
      color: rgba(0, 0, 0, 0.45);
      font-size: 16px;
    }
    .text {
      font-size: 20px;
    }
    .supplement {
      font-size: 12px;
      font-weight: lighter;
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
