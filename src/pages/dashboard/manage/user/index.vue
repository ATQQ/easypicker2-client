<template>
  <div class="user">
    <div class="panel">
      <div class="p10 log-filter">
        <span class="item">
          <span class="label">状态</span>
          <el-select v-model="filterLogType" size="default" placeholder="请选择日志类型">
            <el-option v-for="(item, idx) in logTypeList" :key="idx" :label="item.label" :value="item.type"></el-option>
          </el-select>
        </span>
        <span class="item">
          <el-input size="default" clearable placeholder="请输入要检索的内容" :prefix-icon="Search" v-model="searchWord">
          </el-input>
        </span>
      </div>
      <el-table height="550" stripe border :default-sort="{ prop: 'date', order: 'descending' }" :data="pageUsers"
        style="width: 100%">
        <el-table-column prop="account" label="账号" width="120"></el-table-column>
        <el-table-column prop="phone" label="手机号" width="100"></el-table-column>
        <el-table-column sortable prop="login_time" label="最后登录时间" width="190">
          <template #default="scope">{{ scope.row.login_time && formatDate(new Date(scope.row.login_time)) }}</template>
        </el-table-column>
        <el-table-column prop="join_time" label="注册时间" width="190">
          <template #default="scope">{{ formatDate(new Date(scope.row.join_time)) }}</template>
        </el-table-column>
        <el-table-column sortable prop="login_count" label="登录次数"></el-table-column>
        <el-table-column prop="open_time" label="解封时间" v-if="filterLogType === 1">
          <template #default="scope">{{ scope.row.open_time && formatDate(new Date(scope.row.open_time)) }}</template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="100">
          <template #default="scope">
            <div class="text-btn-list">
              <el-button @click="handleChangeStatus(scope.row.id, scope.row.status, scope.row.open_time)" type="text"
                size="small">修改状态</el-button>
              <el-button @click="handleResetPassword(scope.row.id)" type="text" size="small">重置密码</el-button>
              <el-button type="text" size="small">绑定手机号</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div class="flex fc p10">
        <el-pagination :current-page="pageCurrent" @current-change="handlePageChange" background :page-count="pageCount"
          :page-sizes="[10, 50, 100, 200]" :page-size="pageSize" @size-change="handleSizeChange"
          :total="filterUsers.length" layout="total, sizes, prev, pager, next, jumper"></el-pagination>
      </div>
    </div>
    <!-- 用户状态修改弹窗 -->
    <el-dialog :fullscreen="isMobile" center title="状态修改" v-model="showUserStatusDialog">
      <div class="tc">
        <el-select v-model="selectStatus" placeholder="请选择新分类">
          <el-option v-for="s in userStatusList" :key="s.type" :label="s.label" :value="s.type"></el-option>
        </el-select>
      </div>
      <div style="margin-top: 10px;" class="tc" v-if="selectStatus === 1">
        <el-date-picker :editable="false" v-model="openTime" type="datetime" placeholder="点击设置解封日期"></el-date-picker>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showUserStatusDialog = false">取 消</el-button>
          <el-button type="primary" @click="handleSaveStatus">确 定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 重置密码 -->
    <el-dialog :fullscreen="isMobile" center title="密码重置" v-model="showResetPasswordDialog">
      <div class="tc">
        <el-form :model="pwdForm" label-width="80px">
          <el-form-item label="新密码">
            <el-input show-word-limit clearable v-model="pwdForm.pwd1" placeholder="请输入新密码" maxlength="16"
              minlength="6" />
          </el-form-item>
          <el-form-item>
            <el-input show-word-limit clearable v-model="pwdForm.pwd2" placeholder="请再次输入" maxlength="16"
              minlength="6" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showResetPasswordDialog = false">取 消</el-button>
          <el-button type="primary" @click="handleSavePassword">确 定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>
<script lang="ts" setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  computed, onMounted, reactive, ref,
} from 'vue'
import { useStore } from 'vuex'
import { Search } from '@element-plus/icons-vue'
import { SuperUserApi } from '@/apis'
import { USER_STATUS } from '@/constants'
import { formatDate } from '@/utils/stringUtil'
import { rPassword } from '@/utils/regExp'

const $store = useStore()
// 用户
const users: any[] = reactive([])
const refreshUsers = () => {
  SuperUserApi.getUserList().then((res) => {
    users.splice(0, users.length)
    const d = res.data.list
    users.push(...d)
  })
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
  .filter((v) => v.status === filterLogType.value)
  .filter((v) => {
    const {
      account, phone, join_time, login_count, login_time, open_time,
    } = v
    if (searchWord.value.length === 0) return true
    return `${account} ${phone} ${login_count} ${formatDate(open_time)} ${formatDate(login_time)} ${formatDate(join_time)}`.includes(searchWord.value)
  }))

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
const handleChangeStatus = (userId: number, status: USER_STATUS, oTime: string) => {
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

// 重置密码
const showResetPasswordDialog = ref(false)
const pwdForm = reactive({
  pwd1: '',
  pwd2: '',
})
const handleResetPassword = (userId: number) => {
  selectUserId.value = userId
  showResetPasswordDialog.value = true
  pwdForm.pwd1 = ''
  pwdForm.pwd2 = ''
}

const checkPwdForm = () => {
  if (!rPassword.test(pwdForm.pwd1)) {
    ElMessage.warning('密码格式不正确(6-16位 支持字母/数字/下划线)')
    return false
  }
  if (pwdForm.pwd1 !== pwdForm.pwd2) {
    ElMessage.warning('两次输入的密码不一致')
    return false
  }

  return true
}

const handleSavePassword = () => {
  if (!checkPwdForm()) return
  ElMessageBox.confirm('此操作不可逆，请谨慎操作', '确定要重置用户的密码吗?', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    SuperUserApi.resetPassword(selectUserId.value, pwdForm.pwd1).then(() => {
      ElMessage.success('重置成功')
      showResetPasswordDialog.value = false
    })
  }).catch(() => {
    //
  })
}

onMounted(() => {
  refreshUsers()
})
const isMobile = computed(() => $store.getters['public/isMobile'])

</script>

<style scoped lang="scss">
@media screen and (max-width: 700px) {
  .user {
    margin-top: 40px !important;
  }

  .log-filter {
    justify-content: center;
  }
}

.user {
  margin: 0 auto;
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
    margin-bottom: 10px;

    .label {
      margin-right: 10px;
      font-size: 12px;
    }
  }
}

.text-btn-list {
  display: flex;
  flex-wrap: wrap;

  button {
    margin-left: 0;
  }
}
</style>
