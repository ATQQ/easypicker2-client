<script lang="ts" setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { DeleteFilled, Message, Refresh, Search } from '@element-plus/icons-vue'
import { useLocalStorage } from '@vueuse/core'
import { PublicApi, SuperUserApi } from '@/apis'
import { USER_STATUS } from '@/constants'
import { formatDate, formatSize } from '@/utils/stringUtil'
import { rMobilePhone, rPassword, rVerCode } from '@/utils/regExp'

import { useIsMobile } from '@/composables'

// 用户
const users = reactive<SuperUserApiTypes.UserItem[]>([])
function refreshUsers() {
  SuperUserApi.getUserList().then((res) => {
    users.splice(0, users.length, ...res.data.list)
    ElMessage.success('列表数据刷新成功')
  })
}

// 筛选用户状态
const userStatusType = useLocalStorage('userStatusType', USER_STATUS.NORMAL)
const searchWord = ref('')
const statusTypeList = reactive([
  {
    label: '正常',
    type: USER_STATUS.NORMAL,
  },
  {
    label: '冻结',
    type: USER_STATUS.FREEZE,
  },
  {
    label: '封禁',
    type: USER_STATUS.BAN,
  },
])
const sortType = useLocalStorage('userListSortType', 'id')
const sortTypeList = [
  {
    label: 'ID',
    value: 'id',
  },
  {
    label: '累计上传数量',
    value: 'fileCount',
  },
  {
    label: 'OSS文件数量',
    value: 'ossCount',
  },
  {
    label: '最后登录时间',
    value: 'lastLoginTime',
  },
  {
    label: '登录次数',
    value: 'login_count',
  },
  {
    label: '容量大小',
    value: 'size',
  },
  {
    label: '占用空间',
    value: 'usage',
  },
  {
    label: '限制使用',
    value: 'limitUpload',
  },
  {
    label: '下载次数',
    value: 'downloadCount',
  },
  {
    label: '累计下载大小',
    value: 'downloadSize',
  },
  {
    label: '累计费用',
    value: 'cost',
  },
]

// 升降序
const sortOrder = useLocalStorage('userListSortOrder', 'desc')
const sortOrderList = [
  {
    label: '升序',
    value: 'asc',
  },
  {
    label: '降序',
    value: 'desc',
  },
]
const filterUsers = computed(() => {
  const copyUsers = [...users]
  copyUsers.sort((a, b) => {
    return sortOrder.value === 'asc'
      ? a[sortType.value] - b[sortType.value]
      : b[sortType.value] - a[sortType.value]
  })
  return copyUsers
    .filter(v => v.status === userStatusType.value)
    .filter((v) => {
      const {
        id,
        account,
        phone,
        joinTime,
        loginCount,
        loginTime,
        openTime,
      } = v
      if (searchWord.value.length === 0)
        return true
      return `${id} ${account} ${phone} ${loginTime} ${formatDate(
        openTime,
      )} ${formatDate(loginCount)} ${formatDate(joinTime)}`.includes(
        searchWord.value,
      )
    })
})

// 分页
const pageSize = useLocalStorage<number>('userListPageSize', 10)
function handleSizeChange(v: number) {
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
function handlePageChange(idx: number) {
  pageCurrent.value = idx
}

// 状态修改
const showUserStatusDialog = ref(false)
const selectUserId = ref(0)
const selectStatus = ref(USER_STATUS.NORMAL)
const userStatusList = statusTypeList
const openTime = ref('')
function handleChangeStatus(userId: number, status: USER_STATUS, oTime: string) {
  selectUserId.value = userId
  selectStatus.value = status
  openTime.value = oTime
  showUserStatusDialog.value = true
}
function handleSaveStatus() {
  const user = users.find(u => u.id === selectUserId.value)
  if (selectStatus.value === USER_STATUS.FREEZE) {
    if (!openTime.value) {
      ElMessage.warning('请设置解冻时间')
      return
    }
    user.openTime = openTime.value
  }
  else {
    user.openTime = ''
  }
  user.status = selectStatus.value
  showUserStatusDialog.value = false
  SuperUserApi.updateUserStatus(user.id, user.status, user.openTime).then(
    () => {
      ElMessage.success('修改成功')
    },
  )
}

// 重置密码
const showResetPasswordDialog = ref(false)
const pwdForm = reactive({
  pwd1: '',
  pwd2: '',
})
function handleResetPassword(userId: number) {
  selectUserId.value = userId
  showResetPasswordDialog.value = true
  pwdForm.pwd1 = ''
  pwdForm.pwd2 = ''
}

function checkPwdForm() {
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

function handleSavePassword() {
  if (!checkPwdForm())
    return
  ElMessageBox.confirm('此操作不可逆，请谨慎操作', '确定要重置用户的密码吗?', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
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

// 限制空间大小
const showLimitSizeDialog = ref(false)
const limitSizeForm = reactive({
  size: 2,
})
function handleRewriteSize(id: number, size: number) {
  selectUserId.value = id
  limitSizeForm.size = size
  showLimitSizeDialog.value = true
}
async function handleSaveSize() {
  if (+limitSizeForm.size < 0) {
    ElMessage.warning('空间上限不能小于0')
    return
  }
  await SuperUserApi.resetLimitSpace(selectUserId.value, +limitSizeForm.size)
  // 接口调用修改
  ElMessage.success('修改成功')
  showLimitSizeDialog.value = false
  refreshUsers()
}

// 绑定手机号
const showPhoneDialog = ref(false)
const phoneForm = reactive({
  phone: '',
  code: '',
})
const codeText = ref('获取验证码')
const time = ref(0)
function refreshCodeText() {
  if (time.value === 0) {
    codeText.value = '获取验证码'
    return
  }
  codeText.value = `${time.value}s`
  time.value -= 1
  setTimeout(refreshCodeText, 1000)
}
function getCode() {
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
      const { code: c } = err
      const msg = '注册失败,未知错误'
      const options: any = {
        1002: '手机号已被注册',
        1006: '手机号格式不正确',
      }
      ElMessage.error(options[c] || msg)
    })
}
function checkPhoneForm() {
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
function handleBindPhone(id: number) {
  selectUserId.value = id
  showPhoneDialog.value = true
}
async function handleSavePhone() {
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
        1003: '验证码不正确',
      }
      ElMessage.error(options[c] || msg)
    })
}

function handleClearFiles(userId: number, type: 'month' | 'quarter' | 'half') {
  const tipWords = {
    month: '一个月前',
    quarter: '三个月前',
    half: '半年前',
  }
  selectUserId.value = userId
  ElMessageBox.confirm('移除后这些文件将无法恢复，请谨慎操作', '删除前确认？', {
    confirmButtonText: `确认删除 ${tipWords[type]}文件`,
  })
    .then(() => {
      SuperUserApi.clearOssFile(userId, type).then(() => {
        ElMessage.success('清理成功')
      })
    })
    .catch(() => {})
}

// TODO: 0 global 1 user_push
const pushMessageType = ref(1)
const showMessageDialog = ref(false)
const pushMessageText = ref('')
function sendMessage(id: number, type = 1) {
  selectUserId.value = id
  pushMessageType.value = type
  showMessageDialog.value = true
}

function sureSendMessage() {
  SuperUserApi.sendMessage(
    pushMessageText.value,
    pushMessageType.value,
    selectUserId.value,
  ).then(() => {
    ElMessage.success('推送成功')
    // 推送成功
    pushMessageText.value = ''
    showMessageDialog.value = false
  })
}
function logout(account: string) {
  SuperUserApi.logout(account).then(() => {
    ElMessage.success(`下线成功 ${account}`)
    refreshUsers()
  })
}

onMounted(() => {
  refreshUsers()
})

const isMobile = useIsMobile()
</script>

<template>
  <div class="user">
    <div class="panel">
      <div class="p10 log-filter">
        <span class="item">
          <span class="label">状态</span>
          <el-select
            v-model="userStatusType"
            size="default"
            class="w100"
          >
            <el-option
              v-for="(item, idx) in statusTypeList"
              :key="idx"
              :label="item.label"
              :value="item.type"
            />
          </el-select>
        </span>
        <span class="item">
          <span class="label">排序</span>
          <el-select
            v-model="sortType"
            size="default"
            class="w100"
          >
            <el-option
              v-for="(item, idx) in sortTypeList"
              :key="idx"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <el-select
            v-model="sortOrder"
            size="default"
            class="w100"
          >
            <el-option
              v-for="(item, idx) in sortOrderList"
              :key="idx"
              :label="item.label"
              :value="item.value"
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
          <el-button size="default" :icon="Refresh" @click="refreshUsers">刷新</el-button>
        </span>
        <span class="item">
          <el-button
            size="warning"
            :icon="Message"
            @click="sendMessage(null, 0)"
          >推送全局消息</el-button>
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
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column
          prop="account"
          label="账号"
          width="130"
        />
        <el-table-column prop="onlineCount" label="token" width="80" />
        <el-table-column
          prop="phone"
          label="手机号"
          width="80"
        />
        <el-table-column
          prop="loginTime"
          label="最后登录"
          width="190"
        >
          <template #default="scope">
            {{
              scope.row.loginTime && formatDate(new Date(scope.row.loginTime))
            }}
          </template>
        </el-table-column>
        <el-table-column prop="joinTime" label="注册时间" width="190">
          <template #default="scope">
            {{
              formatDate(new Date(scope.row.joinTime))
            }}
          </template>
        </el-table-column>
        <el-table-column
          prop="loginCount"
          label="登录次数"
        />
        <el-table-column
          v-if="userStatusType === 1"
          prop="openTime"
          label="解封时间"
        >
          <template #default="scope">
            {{
              scope.row.openTime && formatDate(new Date(scope.row.openTime))
            }}
          </template>
        </el-table-column>
        <el-table-column
          prop="fileCount"
          label="收集文件"
        >
          <template #default="scope">
            {{ scope.row.fileCount }}/{{ scope.row.ossCount }}<br>
            <span>{{ scope.row.size && scope.row.ossCount && formatSize(Math.round(scope.row.size / scope.row.ossCount)) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="云空间" width="200">
          <template
            #default="{
              row: { resources, monthAgoSize, quarterAgoSize, halfYearSize, id, limitSize, limitUpload, percentage },
            }"
          >
            <ul class="user-oss-info" :class="{ disabled: limitUpload }">
              <li>{{ percentage }}% {{ resources }}/{{ limitSize }}</li>
              <li>
                一月前：{{ monthAgoSize
                }}<el-button
                  v-if="resources !== '0B'"
                  class="clear-btn"
                  :icon="DeleteFilled"
                  circle
                  size="small"
                  @click="handleClearFiles(id, 'month')"
                />
              </li>
              <li>
                三月前：{{ quarterAgoSize
                }}<el-button
                  v-if="quarterAgoSize !== '0B'"
                  class="clear-btn"
                  :icon="DeleteFilled"
                  circle
                  size="small"
                  @click="handleClearFiles(id, 'quarter')"
                />
              </li>
              <li>
                半年前：{{ halfYearSize
                }}<el-button
                  v-if="halfYearSize !== '0B'"
                  class="clear-btn"
                  :icon="DeleteFilled"
                  circle
                  size="small"
                  @click="handleClearFiles(id, 'half')"
                />
              </li>
            </ul>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="100">
          <template #default="scope">
            <div class="text-btn-list">
              <el-button
                type="primary"
                text
                size="small"
                @click="
                  handleChangeStatus(
                    scope.row.id,
                    scope.row.status,
                    scope.row.openTime,
                  )
                "
              >
                修改状态
              </el-button>
              <el-button
                type="primary"
                text
                size="small"
                @click="handleResetPassword(scope.row.id)"
              >
                重置密码
              </el-button>
              <el-button
                type="primary"
                text
                size="small"
                @click="handleBindPhone(scope.row.id)"
              >
                绑定手机号
              </el-button>
              <el-button
                type="warning"
                text
                size="small"
                @click="sendMessage(scope.row.id)"
              >
                发送消息
              </el-button>
              <el-button
                type="danger"
                text
                size="small"
                @click="handleRewriteSize(scope.row.id, scope.row.size)"
              >
                修改上限
              </el-button>
              <el-button
                v-if="scope.row.onlineCount !== 0"
                type="danger"
                text
                size="small"
                @click="logout(scope.row.account)"
              >
                一键下线
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div class="flex fc p10">
        <el-pagination
          :current-page="pageCurrent"
          background
          :page-count="pageCount"
          :page-sizes="[10, 50, 100, 200]"
          :page-size="pageSize"
          :total="filterUsers.length"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </div>
    <!-- 消息推送弹窗 -->
    <el-dialog
      v-model="showMessageDialog"
      :fullscreen="isMobile"
      center
      title="消息推送"
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
      v-model="showUserStatusDialog"
      :fullscreen="isMobile"
      center
      title="状态修改"
    >
      <div class="tc">
        <el-select v-model="selectStatus" placeholder="请选择新分类">
          <el-option
            v-for="s in userStatusList"
            :key="s.type"
            :label="s.label"
            :value="s.type"
          />
        </el-select>
      </div>
      <div v-if="selectStatus === 1" style="margin-top: 10px" class="tc">
        <el-date-picker
          v-model="openTime"
          :editable="false"
          type="datetime"
          placeholder="点击设置解封日期"
        />
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
      v-model="showResetPasswordDialog"
      :fullscreen="isMobile"
      center
      title="密码重置"
    >
      <div class="tc">
        <el-form :model="pwdForm" label-width="80px">
          <el-form-item label="新密码">
            <el-input
              v-model="pwdForm.pwd1"
              show-word-limit
              clearable
              placeholder="请输入新密码"
              maxlength="16"
              minlength="6"
            />
          </el-form-item>
          <el-form-item>
            <el-input
              v-model="pwdForm.pwd2"
              show-word-limit
              clearable
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
          <el-button type="primary" @click="handleSavePassword">确 定</el-button>
        </span>
      </template>
    </el-dialog>
    <!-- 重绑定手机号 -->
    <el-dialog
      v-model="showPhoneDialog"
      :fullscreen="isMobile"
      center
      title="绑定手机号"
    >
      <div class="tc">
        <el-form :model="phoneForm" label-width="60px">
          <el-form-item label="手机号">
            <el-input
              v-model="phoneForm.phone"
              show-word-limit
              clearable
              placeholder="请输入手机号"
              maxlength="11"
            >
              <template #append>
                <!-- 获取验证码 -->
                <el-button :disabled="time !== 0" @click="getCode">
                  {{
                    codeText
                  }}
                </el-button>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-input
              v-model="phoneForm.code"
              show-word-limit
              clearable
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
    <!-- 修改空间上限 -->
    <el-dialog
      v-model="showLimitSizeDialog"
      :fullscreen="isMobile"
      center
      title="修改空间上限"
    >
      <div class="tc">
        <el-form :model="limitSizeForm" label-width="60px">
          <el-form-item label="大小">
            <el-input
              v-model="limitSizeForm.size"
              show-word-limit
              clearable
              placeholder="请输入空间上限"
              maxlength="4"
              type="number"
            >
              <template #append>
                GB
              </template>
            </el-input>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showLimitSizeDialog = false">取 消</el-button>
          <el-button type="primary" @click="handleSaveSize">确 定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
@media screen and (max-width: 700px) {
  .user {
    margin-top: 40px !important;
  }

  .log-filter {
    justify-content: center;
  }
}
.w100 {
  width: 100px;
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
  &.disabled {
    background-color: rgb(245 108 108 / 30%);
  }
}
</style>
