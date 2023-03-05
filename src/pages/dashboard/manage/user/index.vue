<template>
  <div class="user">
    <div class="panel">
      <div class="p10 log-filter">
        <span class="item">
          <span class="label">状态</span>
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
            ></el-option>
          </el-select>
        </span>
        <span class="item">
          <el-input
            size="default"
            clearable
            placeholder="请输入要检索的内容"
            :prefix-icon="Search"
            v-model="searchWord"
          >
          </el-input>
        </span>
        <span class="item">
          <el-button size="default" :icon="Refresh" @click="refreshUsers"
            >刷新</el-button
          >
        </span>
        <span class="item">
          <el-button
            size="warning"
            :icon="Message"
            @click="sendMessage(null, 0)"
            >推送全局消息</el-button
          >
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
        <el-table-column
          prop="account"
          label="账号"
          width="120"
        ></el-table-column>
        <el-table-column
          prop="phone"
          label="手机号"
          width="100"
        ></el-table-column>
        <el-table-column
          sortable
          prop="login_time"
          label="最后登录时间"
          width="190"
        >
          <template #default="scope">{{
            scope.row.login_time && formatDate(new Date(scope.row.login_time))
          }}</template>
        </el-table-column>
        <el-table-column prop="join_time" label="注册时间" width="190">
          <template #default="scope">{{
            formatDate(new Date(scope.row.join_time))
          }}</template>
        </el-table-column>
        <el-table-column
          sortable
          prop="login_count"
          label="登录次数"
        ></el-table-column>
        <el-table-column
          prop="open_time"
          label="解封时间"
          v-if="filterLogType === 1"
        >
          <template #default="scope">{{
            scope.row.open_time && formatDate(new Date(scope.row.open_time))
          }}</template>
        </el-table-column>
        <el-table-column
          sortable
          prop="fileCount"
          label="收集文件数"
        ></el-table-column>
        <el-table-column label="占用云空间" width="200">
          <template
            #default="{
              row: { resources, monthAgoSize, quarterAgoSize, halfYearSize, id }
            }"
          >
            <ul class="user-oss-info">
              <li>总大小：{{ resources }}</li>
              <li>
                一月前：{{ monthAgoSize
                }}<el-button
                  v-if="resources !== '0B'"
                  class="clear-btn"
                  @click="handleClearFiles(id, 'month')"
                  :icon="DeleteFilled"
                  circle
                  size="small"
                ></el-button>
              </li>
              <li>
                三月前：{{ quarterAgoSize
                }}<el-button
                  v-if="quarterAgoSize !== '0B'"
                  class="clear-btn"
                  @click="handleClearFiles(id, 'quarter')"
                  :icon="DeleteFilled"
                  circle
                  size="small"
                ></el-button>
              </li>
              <li>
                半年前：{{ halfYearSize
                }}<el-button
                  v-if="halfYearSize !== '0B'"
                  class="clear-btn"
                  @click="handleClearFiles(id, 'half')"
                  :icon="DeleteFilled"
                  circle
                  size="small"
                ></el-button>
              </li>
            </ul>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="100">
          <template #default="scope">
            <div class="text-btn-list">
              <el-button
                @click="
                  handleChangeStatus(
                    scope.row.id,
                    scope.row.status,
                    scope.row.open_time
                  )
                "
                type="primary"
                text
                size="small"
                >修改状态</el-button
              >
              <el-button
                @click="handleResetPassword(scope.row.id)"
                type="primary"
                text
                size="small"
                >重置密码</el-button
              >
              <el-button
                @click="handleBindPhone(scope.row.id)"
                type="primary"
                text
                size="small"
                >绑定手机号</el-button
              >
              <el-button
                @click="sendMessage(scope.row.id)"
                type="warning"
                text
                size="small"
                >发送消息</el-button
              >
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div class="flex fc p10">
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
    <!-- 消息推送弹窗 -->
    <el-dialog
      :fullscreen="isMobile"
      center
      title="消息推送"
      v-model="showMessageDialog"
    >
      <div class="tc">
        <el-input
          v-model="pushMessageText"
          :autosize="{ minRows: 6, maxRows: 20 }"
          type="textarea"
          placeholder="输入要推送的消息，支持HTML内容（推荐使用mdnice 转 markdown 转html）"
        />
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showMessageDialog = false">取 消</el-button>
          <el-button type="primary" @click="sureSendMessage">确 定</el-button>
        </span>
      </template>
    </el-dialog>
    <!-- 用户状态修改弹窗 -->
    <el-dialog
      :fullscreen="isMobile"
      center
      title="状态修改"
      v-model="showUserStatusDialog"
    >
      <div class="tc">
        <el-select v-model="selectStatus" placeholder="请选择新分类">
          <el-option
            v-for="s in userStatusList"
            :key="s.type"
            :label="s.label"
            :value="s.type"
          ></el-option>
        </el-select>
      </div>
      <div style="margin-top: 10px" class="tc" v-if="selectStatus === 1">
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

    <!-- 重置密码 -->
    <el-dialog
      :fullscreen="isMobile"
      center
      title="密码重置"
      v-model="showResetPasswordDialog"
    >
      <div class="tc">
        <el-form :model="pwdForm" label-width="80px">
          <el-form-item label="新密码">
            <el-input
              show-word-limit
              clearable
              v-model="pwdForm.pwd1"
              placeholder="请输入新密码"
              maxlength="16"
              minlength="6"
            />
          </el-form-item>
          <el-form-item>
            <el-input
              show-word-limit
              clearable
              v-model="pwdForm.pwd2"
              placeholder="请再次输入"
              maxlength="16"
              minlength="6"
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showResetPasswordDialog = false">取 消</el-button>
          <el-button type="primary" @click="handleSavePassword"
            >确 定</el-button
          >
        </span>
      </template>
    </el-dialog>
    <!-- 重绑定手机号 -->
    <el-dialog
      :fullscreen="isMobile"
      center
      title="绑定手机号"
      v-model="showPhoneDialog"
    >
      <div class="tc">
        <el-form :model="phoneForm" label-width="60px">
          <el-form-item label="手机号">
            <el-input
              show-word-limit
              clearable
              v-model="phoneForm.phone"
              placeholder="请输入手机号"
              maxlength="11"
            >
              <template #append>
                <!-- 获取验证码 -->
                <el-button :disabled="time !== 0" @click="getCode">{{
                  codeText
                }}</el-button>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-input
              show-word-limit
              clearable
              v-model="phoneForm.code"
              placeholder="请输入验证码"
              maxlength="4"
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showPhoneDialog = false">取 消</el-button>
          <el-button type="primary" @click="handleSavePhone">确 定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>
<script lang="ts" setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { useStore } from 'vuex'
import { Search, DeleteFilled, Refresh, Message } from '@element-plus/icons-vue'
import { PublicApi, SuperUserApi } from '@/apis'
import { USER_STATUS } from '@/constants'
import { formatDate } from '@/utils/stringUtil'
import { rMobilePhone, rPassword, rVerCode } from '@/utils/regExp'

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
    type: USER_STATUS.NORMAL
  },
  {
    label: '冻结',
    type: USER_STATUS.FREEZE
  },
  {
    label: '封禁',
    type: USER_STATUS.BAN
  }
])

const filterUsers = computed(() =>
  users
    .filter((v) => v.status === filterLogType.value)
    .filter((v) => {
      const { account, phone, join_time, login_count, login_time, open_time } =
        v
      if (searchWord.value.length === 0) return true
      return `${account} ${phone} ${login_count} ${formatDate(
        open_time
      )} ${formatDate(login_time)} ${formatDate(join_time)}`.includes(
        searchWord.value
      )
    })
)

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
  const end = pageCurrent.value * pageSize.value
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
const handleChangeStatus = (
  userId: number,
  status: USER_STATUS,
  oTime: string
) => {
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
  SuperUserApi.updateUserStatus(user.id, user.status, user.open_time).then(
    () => {
      ElMessage.success('修改成功')
    }
  )
}

// 重置密码
const showResetPasswordDialog = ref(false)
const pwdForm = reactive({
  pwd1: '',
  pwd2: ''
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
    type: 'warning'
  })
    .then(() => {
      SuperUserApi.resetPassword(selectUserId.value, pwdForm.pwd1).then(() => {
        ElMessage.success('重置成功')
        showResetPasswordDialog.value = false
      })
    })
    .catch(() => {
      //
    })
}

// 绑定手机号
const showPhoneDialog = ref(false)
const phoneForm = reactive({
  phone: '',
  code: ''
})
const codeText = ref('获取验证码')
const time = ref(0)
const refreshCodeText = () => {
  if (time.value === 0) {
    codeText.value = '获取验证码'
    return
  }
  codeText.value = `${time.value}s`
  time.value -= 1
  setTimeout(refreshCodeText, 1000)
}
const getCode = () => {
  if (!rMobilePhone.test(phoneForm.phone)) {
    ElMessage.warning('手机号格式不正确')
    return
  }
  // check是否可用
  PublicApi.checkPhone(phoneForm.phone)
    .then(() => {
      PublicApi.getCode(phoneForm.phone).then(() => {
        time.value = 120
        refreshCodeText()
        ElMessage.success('获取成功,请注意查看手机短信')
      })
    })
    .catch((err) => {
      // TODO:编写通用方法处理失败信息弹窗回掉
      const { code: c } = err
      const msg = '注册失败,未知错误'
      const options: any = {
        1002: '手机号已被注册',
        1006: '手机号格式不正确'
      }
      ElMessage.error(options[c] || msg)
    })
}
const checkPhoneForm = () => {
  if (!rMobilePhone.test(phoneForm.phone)) {
    ElMessage.warning('手机号格式不正确')
    return false
  }
  if (!rVerCode.test(phoneForm.code)) {
    ElMessage.warning('验证码格式不正确')
    return false
  }

  return true
}
const handleBindPhone = (id: number) => {
  selectUserId.value = id
  showPhoneDialog.value = true
}
const handleSavePhone = async () => {
  if (!checkPhoneForm()) {
    return
  }
  // 调用API更新，验证码 不正确判断
  SuperUserApi.resetPhone(selectUserId.value, phoneForm.phone, phoneForm.code)
    .then(() => {
      ElMessage.success('绑定成功')
      showPhoneDialog.value = false
      phoneForm.code = ''
      phoneForm.phone = ''
      refreshUsers()
    })
    .catch((err) => {
      const { code: c } = err
      const msg = '绑定失败,未知错误'
      const options: any = {
        1002: '手机号已被注册',
        1003: '验证码不正确'
      }
      ElMessage.error(options[c] || msg)
    })
}

const handleClearFiles = (
  userId: number,
  type: 'month' | 'quarter' | 'half'
) => {
  const tipWords = {
    month: '一个月前',
    quarter: '三个月前',
    half: '半年前'
  }
  selectUserId.value = userId
  ElMessageBox.confirm('移除后这些文件将无法恢复，请谨慎操作', '删除前确认？', {
    confirmButtonText: `确认删除 ${tipWords[type]}文件`
  })
    .then(() => {
      SuperUserApi.clearOssFile(userId, type).then(() => {
        ElMessage.success('清理成功')
      })
    })
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    .catch(() => {})
}

// TODO: 0 global 1 user_push
const pushMessageType = ref(1)
const showMessageDialog = ref(false)
const pushMessageText = ref('')
const sendMessage = (id: number, type = 1) => {
  selectUserId.value = id
  pushMessageType.value = type
  showMessageDialog.value = true
}

const sureSendMessage = () => {
  SuperUserApi.sendMessage(
    pushMessageText.value,
    pushMessageType.value,
    selectUserId.value
  ).then(() => {
    ElMessage.success('推送成功')
    // 推送成功
    pushMessageText.value = ''
    showMessageDialog.value = false
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

.user-oss-info {
  list-style: none;
  li {
    margin-bottom: 10px;
  }
  .clear-btn {
    margin-left: 10px;
  }
}
</style>
