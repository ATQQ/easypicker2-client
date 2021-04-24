<template>
  <div class="user">
    <div class="panel">
      <div class="p10 log-filter">
        <span class="item">
          <span class="label">状态</span>
          <el-select v-model="filterLogType" size="medium" placeholder="请选择日志类型">
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
            size="medium"
            clearable
            placeholder="请输入要检索的内容"
            prefix-icon="el-icon-search"
            v-model="searchWord"
          ></el-input>
        </span>
      </div>
      <el-table
        height="400"
        stripe
        border
        :default-sort="{ prop: 'date', order: 'descending' }"
        :data="pageUsers"
        style="width: 100%"
      >
        <el-table-column prop="id" label="日期" width="50">
        </el-table-column>
        <!-- <el-table-column prop="type" label="类型" width="140">
          <template #default="scope">{{ getLogsTypeText(scope.row.type) }}</template>
        </el-table-column> -->
        <el-table-column prop="account" label="账号"></el-table-column>
        <el-table-column prop="phone" label="手机号"></el-table-column>
        <el-table-column prop="join_time" label="注册时间"></el-table-column>
        <el-table-column prop="login_time" label="最后登录时间"></el-table-column>
        <el-table-column prop="login_count" label="登录次数"></el-table-column>
        <!-- <el-table-column prop="open_time" label="解封时间"></el-table-column> -->
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
          :total="filterUsers.length"
          layout="total, sizes, prev, pager, next, jumper"
        ></el-pagination>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { SuperUserApi } from '@/apis'
import { USER_STATUS } from '@/constants'
import { formatDate } from '@/utils/stringUtil'
import {
  computed, defineComponent, onMounted, reactive, ref,
} from 'vue'

export default defineComponent({
  setup() {
    // 用户
    const users: any[] = reactive([])
    const refreshUsers = () => {
      SuperUserApi.getUserList().then((res) => {
        users.splice(0, users.length)
        const d = res.data.list
        users.push(...d)
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
    // 筛选用户状态
    const filterLogType = ref(USER_STATUS.NORMAL)
    const searchWord = ref('')
    const logTypeList = reactive([
      {
        label: '正常',
        type: USER_STATUS.NORMAL,
      },
      {
        label: '冻结',
        type: USER_STATUS.FREEZE,
      }, {
        label: '封禁',
        type: USER_STATUS.BAN,
      },
    ])

    const filterUsers = computed(() => users
      .filter((v) => v.status === filterLogType.value))
    // .filter((v) => {
    //   const { date, ip, msg } = v
    //   if (searchWord.value.length === 0) return true
    //   return `${date} ${ip} ${msg}`.includes(searchWord.value)
    // })
    // 分页
    const pageSize = ref(10)
    const handleSizeChange = (v: number) => {
      pageSize.value = v
    }
    const pageCount = computed(() => {
      const t = Math.ceil(filterUsers.value.length / pageSize.value)
      return t
    })
    const pageCurrent = ref(1)
    const pageUsers = computed(() => {
      const start = (pageCurrent.value - 1) * pageSize.value
      const end = (pageCurrent.value) * pageSize.value
      return filterUsers.value.slice(start, end)
    })
    const handlePageChange = (idx: number) => {
      pageCurrent.value = idx
    }
    onMounted(() => {
      refreshUsers()
    })
    return {
      filterUsers,
      formatDate,
      getLogsTypeText,
      pageSize,
      handleSizeChange,
      pageCount,
      pageUsers,
      handlePageChange,
      pageCurrent,
      filterLogType,
      logTypeList,
      searchWord,
    }
  },
})
</script>

<style scoped lang="scss">
.user {
  margin: 0 auto;
}
.card-list {
  display: flex;
  margin-top: 20px;
  justify-content: center;
  flex-wrap: wrap;
}
.card {
  margin: 10px 20px 10px 0;
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
    .label {
      margin-right: 10px;
      font-size: 12px;
    }
  }
}
</style>
