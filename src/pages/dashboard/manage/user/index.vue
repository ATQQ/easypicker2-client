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
        height="550"
        stripe
        border
        :default-sort="{ prop: 'date', order: 'descending' }"
        :data="pageUsers"
        style="width: 100%"
      >
        <el-table-column prop="account" label="账号" width="120"></el-table-column>
        <el-table-column prop="phone" label="手机号" width="70"></el-table-column>
        <el-table-column prop="login_time" label="最后登录时间" width="190">
          <template
            #default="scope"
          >{{ scope.row.login_time && formatDate(new Date(scope.row.login_time)) }}</template>
        </el-table-column>
        <el-table-column prop="join_time" label="注册时间" width="190">
          <template #default="scope">{{ formatDate(new Date(scope.row.join_time)) }}</template>
        </el-table-column>
        <el-table-column prop="login_count" label="登录次数"></el-table-column>
        <el-table-column prop="open_time" label="解封时间" v-if="filterLogType===1">
          <template
            #default="scope"
          >{{ scope.row.open_time && formatDate(new Date(scope.row.open_time)) }}</template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="100">
          <template #default="scope">
            <el-button
              @click="handleChangeStatus(scope.row.id, scope.row.status,scope.row.open_time)"
              type="text"
              size="small"
            >修改状态</el-button>
          </template>
        </el-table-column>
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
    <!-- 用户状态修改弹窗 -->
    <el-dialog center title="状态修改" v-model="showUserStatusDialog">
      <div class="tc">
        <el-select v-model="selectStatus" placeholder="请选择新分类">
          <el-option
          v-for="s in userStatusList"
          :key="s.type"
          :label="s.label" :value="s.type"></el-option>
        </el-select>
      </div>
      <div style="margin-top: 10px;" class="tc" v-if="selectStatus===1">
        <el-date-picker
        :editable="false"
        v-model="openTime"
        type="datetime"
        placeholder="点击设置解封日期"
      ></el-date-picker>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showUserStatusDialog = false">取 消</el-button>
          <el-button type="primary" @click="handleSaveStatus">确 定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>
<script lang="ts">
import { SuperUserApi } from '@/apis'
import { USER_STATUS } from '@/constants'
import { formatDate } from '@/utils/stringUtil'
import { ElMessage } from 'element-plus'
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

    // 状态修改
    const showUserStatusDialog = ref(false)
    const selectUserId = ref(0)
    const selectStatus = ref(USER_STATUS.NORMAL)
    const userStatusList = logTypeList
    const openTime = ref('')
    const handleChangeStatus = (userId: number, status: USER_STATUS, oTime:string) => {
      selectUserId.value = userId
      selectStatus.value = status
      openTime.value = oTime
      showUserStatusDialog.value = true
    }
    const handleSaveStatus = () => {
      const user = users.find((u) => u.id === selectUserId.value)
      if (selectStatus.value === USER_STATUS.FREEZE) {
        if (!openTime.value) {
          ElMessage.warning('请设置解冻时间')
          return
        }
        user.open_time = openTime.value
      } else {
        user.open_time = ''
      }
      user.status = selectStatus.value
      showUserStatusDialog.value = false
      SuperUserApi.updateUserStatus(user.id, user.status, user.open_time)
      ElMessage.success('修改成功')
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
      handleChangeStatus,
      showUserStatusDialog,
      selectStatus,
      userStatusList,
      handleSaveStatus,
      openTime,
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
  max-width: 1256px;
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
