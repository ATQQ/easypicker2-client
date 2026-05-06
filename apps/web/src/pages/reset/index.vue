<script lang="ts" setup>
import loginPanel from '@components/loginPanel.vue'
import {
  ChatDotSquare,
  Lock,
  Phone,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  computed,
  ref,
} from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { PublicApi, UserApi } from '@/apis'
import {
  rEmail,
  rMobilePhone,
  rPassword,
  rVerCode,
} from '@/utils/regExp'
import { useSiteConfig } from '@/composables'

const { value: siteConfig } = useSiteConfig()
const supportEmailCodeLogin = computed(() => Boolean(siteConfig.value.supportEmailCodeLogin))
import { formatDate } from '@/utils/stringUtil'

const account = ref('')
const code = ref('')
const pwd1 = ref('')
const pwd2 = ref('')
const $store = useStore()
const $router = useRouter()
function redirectDashBoard() {
  $router.replace({
    name: 'dashboard',
  })
}
function checkForm() {
  if (!(supportEmailCodeLogin.value && rEmail.test(account.value.trim()))) {
    if (!rMobilePhone.test(account.value)) {
      ElMessage.warning('手机号格式不正确')
      return false
    }
  }
  else if (!rEmail.test(account.value.trim())) {
    ElMessage.warning('邮箱格式不正确')
    return false
  }

  if (!rPassword.test(pwd1.value)) {
    ElMessage.warning('密码格式不正确(6-16位 支持字母/数字/下划线)')
    return false
  }
  if (pwd1.value !== pwd2.value) {
    ElMessage.warning('两次输入的密码不一致')
    return false
  }

  if (!rVerCode.test(code.value)) {
    ElMessage.warning('验证码不正确(4位 数字)')
    return false
  }
  return true
}
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
  if (supportEmailCodeLogin.value && rEmail.test(account.value.trim())) {
    PublicApi.getEmailCode(account.value.trim()).then(() => {
      time.value = 120
      refreshCodeText()
      ElMessage.success('获取成功,请查收邮件')
    }).catch((err) => {
      const { code: c } = err
      const options: Record<number, string> = {
        1015: '邮箱格式不正确',
        1017: '该邮箱未绑定账号',
      }
      ElMessage.error(options[c] || '发送失败')
    })
    return
  }
  if (!rMobilePhone.test(account.value)) {
    ElMessage.warning('手机号格式不正确')
    return
  }
  PublicApi.getCode(account.value).then(() => {
    time.value = 120
    refreshCodeText()
    ElMessage.success('获取成功,请注意查看手机短信')
  })
}
function reset() {
  if (!checkForm()) {
    return
  }
  const payload
    = supportEmailCodeLogin.value && rEmail.test(account.value.trim())
      ? {
          email: account.value.trim(),
          code: code.value,
          pwd: pwd1.value,
        }
      : {
          phone: account.value,
          code: code.value,
          pwd: pwd1.value,
        }
  UserApi
    .resetPwd(payload)
    .then((res) => {
      ElMessage.success('密码重置成功')
      const { token } = res.data
      $store.commit('user/setToken', token)
      redirectDashBoard()
    })
    .catch((err) => {
      const { code: c, data } = err
      const options: any = {
        1008: '该手机号未绑定任何账号',
        1017: '该邮箱未绑定任何账号',
        1003: '验证码不正确',
        1004: '密码格式不正确',
        1010: '账号已被封禁,有疑问请联系管理员',
        1009: `账号已被冻结,解冻时间${data?.openTime && formatDate(new Date(data.openTime))}`,
      }
      ElMessage.error(options[c] || '重置失败,未知错误')
    })
}
</script>

<template>
  <div class="login">
    <login-panel>
      <!-- 表单输入区域 -->
      <div class="inputArea">
        <div>
          <el-input
            v-model="account"
            maxlength="120"
            placeholder="手机号或邮箱"
            :prefix-icon="Phone"
            clearable
          />
        </div>
        <div>
          <el-input
            v-model="code"
            maxlength="4"
            type="number"
            placeholder="请输入验证码"
            :prefix-icon="ChatDotSquare"
            clearable
          >
            <template #append>
              <!-- 获取验证码 -->
              <el-button :disabled="time !== 0" @click="getCode">
                {{ codeText }}
              </el-button>
            </template>
          </el-input>
        </div>
        <div>
          <el-input
            v-model="pwd1"
            maxlength="16"
            minlength="6"
            type="password"
            placeholder="请输入新密码"
            :prefix-icon="Lock"
            show-password
            clearable
          />
        </div>
        <div>
          <el-input
            v-model="pwd2"
            maxlength="16"
            minlength="6"
            type="password"
            placeholder="请再次输入新密码"
            :prefix-icon="Lock"
            show-password
            clearable
          />
        </div>
        <div class="tc">
          <el-button type="primary" class="fw-w100" @click="reset">
            确认重置
          </el-button>
        </div>
        <el-divider />
        <div class="links">
          <router-link to="/login">
            去登陆
          </router-link>
        </div>
      </div>
    </login-panel>
  </div>
</template>

<style scoped lang="scss">
.login {
  background-image: linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%);
  min-height: 100vh;
}

.inputArea {
  // padding: 1rem;
  margin: 0 auto;
  max-width: 320px;
  div {
    margin-top: 10px;
  }
}
// 登录按钮下方链接
.links {
  display: flex;
  justify-content: center;
  a {
    color: #409eff;
    margin-left: 10px;
  }
}
</style>
