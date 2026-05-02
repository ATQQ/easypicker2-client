<script setup lang="ts">
import loginPanel from '@components/loginPanel.vue'
import { Lock, Phone, User } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { PublicApi, UserApi } from '@/apis'
import { useSiteConfig, useSupportRegister } from '@/composables'
import { rMobilePhone, rPassword, rVerCode } from '@/utils/regExp'
import { formatDate } from '@/utils/stringUtil'

const supportRegister = useSupportRegister()
const { value: siteConfig } = useSiteConfig()

const account = ref('')
const pwd = ref('')
const remember = ref(false)
const accountLogin = ref(true)
const supportCodeLogin = computed(() => Boolean(siteConfig.value.supportCodeLogin))
const $store = useStore()
const $router = useRouter()
function redirectDashBoard(system?: boolean) {
  if (system) {
    $router.replace({
      name: 'config',
    })
    return
  }
  const { redirect } = $router.currentRoute.value.query
  if (redirect) {
    $router.replace({
      path: `${redirect}`,
    })
    return
  }

  $router.replace({
    name: 'dashboard',
  })
}
function checkForm() {
  if (account.value.length === 11) {
    if (!rMobilePhone.test(account.value)) {
      ElMessage.warning('手机号格式不正确')
      return false
    }
  }
  // else if (!rAccount.test(account.value)) {
  // 兼容老平台数据,不校验账号
  // ElMessage.warning('帐号格式不正确(4-11位 数字字母)')
  // return false
  // }

  if (accountLogin.value && !rPassword.test(pwd.value)) {
    ElMessage.warning('密码格式不正确(6-16位 支持字母/数字/下划线)')
    return false
  }

  if (!accountLogin.value && !rVerCode.test(pwd.value)) {
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
  if (!supportCodeLogin.value) {
    ElMessage.warning('暂未开启验证码登录')
    return
  }
  if (!rMobilePhone.test(account.value)) {
    ElMessage.warning('手机号格式不正确')
    return
  }
  PublicApi.getCode(account.value)
    .then(() => {
      time.value = 120
      refreshCodeText()
      ElMessage.success('获取成功,请注意查看手机短信')
    })
    .catch((err) => {
      const { code: c } = err
      const msg = '注册失败,未知错误'
      const options = {
        1006: '手机号格式不正确',
      }
      ElMessage.error(options[c] || msg)
    })
}

function loginErrorMsg(err: any, msg: string) {
  const { code, data } = err
  const msgs: any = {
    1010: '账号已被封禁,有疑问请联系管理员',
    1013: '暂未开启验证码登录',
    1009: `账号已被冻结,解冻时间${
      data?.openTime && formatDate(new Date(data.openTime))
    }`,
  }
  ElMessage.error({
    type: 'error',
    message: msgs[code] || msg,
  })
}
function login() {
  if (!checkForm()) {
    return
  }
  // 账号密码
  if (accountLogin.value) {
    if (remember.value) {
      localStorage.setItem(
        'userinfo',
        JSON.stringify({
          account: account.value,
          pwd: pwd.value,
          remember: remember.value,
        }),
      )
    }
    else {
      localStorage.removeItem('userinfo')
    }
    UserApi.login(account.value, pwd.value)
      .then((res) => {
        const { token, system } = res.data
        $store.commit('user/setToken', token)
        $store.commit('user/setSystem', system)
        ElMessage.success({
          message: '登录成功',
          duration: 500,
        })
        redirectDashBoard(system)
      })
      .catch((err) => {
        loginErrorMsg(err, '密码不正确')
      })
  }
  else {
    if (!supportCodeLogin.value) {
      accountLogin.value = true
      ElMessage.warning('暂未开启验证码登录')
      return
    }
    // 手机号验证码登录
    UserApi.codeLogin(account.value, pwd.value)
      .then((res) => {
        const { token } = res.data
        $store.commit('user/setToken', token)
        $store.commit('user/setSystem', false)
        ElMessage.success({
          message: '登录成功',
          duration: 500,
        })
        redirectDashBoard()
      })
      .catch((err) => {
        loginErrorMsg(err, '验证码不正确')
      })
  }
}

watch(supportCodeLogin, (support) => {
  if (!support && !accountLogin.value) {
    accountLogin.value = true
  }
})

onMounted(() => {
  const token = localStorage.getItem('token')
  if (token) {
    redirectDashBoard(localStorage.getItem('system') === 'true')
    return
  }
  const info = localStorage.getItem('userinfo')
  if (info) {
    const user = JSON.parse(info)
    account.value = user.account
    pwd.value = user.pwd
    remember.value = user.remember
  }
})
</script>

<template>
  <div class="login">
    <login-panel>
      <!-- 表单输入区域 -->
      <div class="inputArea">
        <div>
          <el-input
            v-model="account"
            :placeholder="accountLogin ? '输入账号/手机号' : '输入手机号'"
            :prefix-icon="accountLogin ? User : Phone"
            clearable
          >
            <template v-if="supportCodeLogin" #append>
              <template v-if="accountLogin">
                <el-button @click="accountLogin = !accountLogin">
                  验证码登录
                </el-button>
              </template>
              <template v-else>
                <el-button @click="accountLogin = !accountLogin">
                  账号登录
                </el-button>
              </template>
            </template>
          </el-input>
        </div>
        <div>
          <el-input
            v-model="pwd"
            maxlength="16"
            minlength="6"
            :type="accountLogin ? 'password' : 'number'"
            :placeholder="accountLogin ? '请输入密码' : '请输入验证码'"
            :prefix-icon="Lock"
            :show-password="accountLogin"
            clearable
          >
            <template #append>
              <el-button v-if="accountLogin">
                <router-link style="color: #909399" to="/reset">
                  忘记密码?
                </router-link>
              </el-button>
              <!-- 获取验证码 -->
              <el-button v-else :disabled="time !== 0" @click="getCode">
                {{
                  codeText
                }}
              </el-button>
            </template>
          </el-input>
        </div>
        <div class="tc">
          <el-checkbox v-model="remember">
            记住登录信息?
          </el-checkbox>
        </div>
        <div class="tc">
          <el-button type="primary" class="fw-w100" @click="login()">
            登录
          </el-button>
        </div>
        <el-divider />
        <div v-if="supportRegister" class="links">
          <router-link to="/register">
            快速注册
          </router-link>
        </div>
        <div class="links" style="margin-top: 20px">
          <el-link target="_blank" href="https://docs.ep.sugarat.top/author.html#%E8%81%94%E7%B3%BB%E4%BD%9C%E8%80%85">
            问题反馈?
          </el-link>
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
  :deep(.el-input-group__append) {
    width: 80px;
    padding: 0 10px;
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
