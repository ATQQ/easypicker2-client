<template>
  <div class="login">
    <login-panel>
      <!-- 表单输入区域 -->
      <div class="inputArea">
        <div>
          <el-input
            :placeholder="accountLogin ? '输入账号/手机号' : '输入手机号'"
            :prefix-icon="accountLogin ? User : Phone"
            v-model="account"
            clearable
          >
            <template #append>
              <template v-if="accountLogin">
                <el-button @click="accountLogin = !accountLogin">验证码登录</el-button>
              </template>
              <template v-else>
                <el-button @click="accountLogin = !accountLogin">账号登录</el-button>
              </template>
            </template>
          </el-input>
        </div>
        <div>
          <el-input
            maxlength="16"
            minlength="6"
            :type="accountLogin ? 'password' : 'number'"
            :placeholder="accountLogin ? '请输入密码' : '请输入验证码'"
            :prefix-icon="Lock"
            v-model="pwd"
            :show-password="accountLogin"
            clearable
          >
            <template #append>
              <el-button v-if="accountLogin">
                <router-link style="color:#909399;" to="/reset">忘记密码?</router-link>
              </el-button>
              <!-- 获取验证码 -->
              <el-button :disabled="time !== 0" @click="getCode" v-else>{{ codeText }}</el-button>
            </template>
          </el-input>
        </div>
        <div class="tc">
          <el-checkbox v-model="remember">记住登录信息?</el-checkbox>
        </div>
        <div class="tc">
          <el-button @click="login()" type="primary" class="fw-w100">登录</el-button>
        </div>
        <el-divider></el-divider>
        <div class="links">
          <router-link to="/register">快速注册</router-link>
        </div>
      </div>
    </login-panel>
  </div>
</template>
<script setup lang="ts">
import { ElMessage } from 'element-plus'
import {
  onMounted, ref,
} from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import loginPanel from '@components/loginPanel.vue'
import { User, Phone, Lock } from '@element-plus/icons-vue'
import {
  rMobilePhone, rPassword, rVerCode,
} from '@/utils/regExp'
import { formatDate } from '@/utils/stringUtil'
import { PublicApi, UserApi } from '@/apis'

const account = ref('')
const pwd = ref('')
const remember = ref(false)
const accountLogin = ref(true)
const $store = useStore()
const $router = useRouter()
const redirectDashBoard = (system?:boolean) => {
  $router.replace({
    name: system ? 'config' : 'dashboard',
  })
}
const checkForm = () => {
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
  if (!rMobilePhone.test(account.value)) {
    ElMessage.warning('手机号格式不正确')
    return
  }
  PublicApi.getCode(account.value).then(() => {
    time.value = 120
    refreshCodeText()
    ElMessage.success('获取成功,请注意查看手机短信')
  }).catch((err) => {
    const { code: c } = err
    const msg = '注册失败,未知错误'
    const options = {
      1006: '手机号格式不正确',
    }
    ElMessage.error(options[c] || msg)
  })
}

const loginErrorMsg = (err: any, msg: string) => {
  const { code, data } = err
  const msgs: any = {
    1010: '账号已被封禁,有疑问请联系管理员',
    1009: `账号已被冻结,解冻时间${data?.openTime && formatDate(new Date(data.openTime))}`,
  }
  ElMessage.error({
    type: 'error',
    message: msgs[code] || msg,
  })
}
const login = () => {
  if (!checkForm()) {
    return
  }
  // 账号密码
  if (accountLogin.value) {
    if (remember.value) {
      localStorage.setItem('userinfo', JSON.stringify({
        account: account.value,
        pwd: pwd.value,
        remember: remember.value,
      }))
    } else {
      localStorage.removeItem('userinfo')
    }
    UserApi.login(account.value, pwd.value).then((res) => {
      const { token, system } = res.data
      $store.commit('user/setToken', token)
      $store.commit('user/setSystem', system)
      ElMessage.success('登录成功')
      redirectDashBoard(system)
    }).catch((err) => {
      loginErrorMsg(err, '密码不正确')
    })
  } else {
    // 手机号验证码登录
    UserApi.codeLogin(account.value, pwd.value).then((res) => {
      const { token } = res.data
      $store.commit('user/setToken', token)
      $store.commit('user/setSystem', false)
      ElMessage.success('登录成功')
      redirectDashBoard()
    }).catch((err) => {
      loginErrorMsg(err, '验证码不正确')
    })
  }
}
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
  :deep(.el-input-group__append){
    width: 80px;
    padding:0 10px;
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
