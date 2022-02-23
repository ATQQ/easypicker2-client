<template>
  <div class="login">
    <login-panel>
      <!-- 表单输入区域 -->
      <div class="inputArea">
        <div>
          <el-input
            maxlength="11"
            placeholder="手机号"
            :prefix-icon="Phone"
            v-model="account"
            clearable
          ></el-input>
        </div>
        <div>
          <el-input
            maxlength="4"
            type="number"
            placeholder="请输入验证码"
            :prefix-icon="ChatDotSquare"
            v-model="code"
            clearable
          >
            <template #append>
              <!-- 获取验证码 -->
              <el-button :disabled="time !== 0" @click="getCode">{{ codeText }}</el-button>
            </template>
          </el-input>
        </div>
        <div>
          <el-input
            maxlength="16"
            minlength="6"
            type="password"
            placeholder="请输入新密码"
            :prefix-icon="Lock"
            v-model="pwd1"
            show-password
            clearable
          ></el-input>
        </div>
        <div>
          <el-input
            maxlength="16"
            minlength="6"
            type="password"
            placeholder="请再次输入新密码"
            :prefix-icon="Lock"
            v-model="pwd2"
            show-password
            clearable
          ></el-input>
        </div>
        <div class="tc">
          <el-button @click="reset" type="primary" class="fw-w100">确认重置</el-button>
        </div>
        <el-divider></el-divider>
        <div class="links">
          <router-link to="/login">去登陆</router-link>
        </div>
      </div>
    </login-panel>
  </div>
</template>
<script lang="ts" setup>
import { ElMessage } from 'element-plus'
import {
  Lock, Phone, ChatDotSquare,
} from '@element-plus/icons-vue'
import {
  ref,
} from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import loginPanel from '@components/loginPanel.vue'
import { PublicApi, UserApi } from '@/apis'
import {
  rMobilePhone, rPassword, rVerCode,
} from '@/utils/regExp'
import { formatDate } from '@/utils/stringUtil'

const account = ref('')
const code = ref('')
const pwd1 = ref('')
const pwd2 = ref('')
const $store = useStore()
const $router = useRouter()
const redirectDashBoard = () => {
  $router.replace({
    name: 'dashboard',
  })
}
const checkForm = () => {
  if (!rMobilePhone.test(account.value)) {
    ElMessage.warning('手机号格式不正确')
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
  })
}
const reset = () => {
  if (!checkForm()) {
    return
  }
  UserApi
    .resetPwd(account.value, code.value, pwd1.value)
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
        1003: '验证码不正确',
        1004: '密码格式不正确',
        1010: '账号已被封禁,有疑问请联系管理员',
        1009: `账号已被冻结,解冻时间${data?.openTime && formatDate(new Date(data.openTime))}`,
      }
      ElMessage.error(options[c] || '重置失败,未知错误')
    })
}

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
