<template>
  <div class="register">
    <login-panel>
      <div class="inputArea">
        <div>
          <el-input
            maxlength="8"
            placeholder="输入账号"
            prefix-icon="el-icon-user"
            v-model="account"
            clearable
          ></el-input>
        </div>
        <div>
          <el-input
            maxlength="16"
            minlength="6"
            type="password"
            placeholder="请输入密码"
            prefix-icon="el-icon-lock"
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
            placeholder="请再次输入密码"
            prefix-icon="el-icon-lock"
            v-model="pwd2"
            show-password
            clearable
          ></el-input>
        </div>
        <div class="tc">
          <el-checkbox v-model="bindPhone">绑定手机</el-checkbox>
          <el-tooltip effect="dark" content="可用于修改/找回密码" placement="top-start">
            <i class="el-icon-question"></i>
          </el-tooltip>
        </div>
        <div v-if="bindPhone">
          <el-input
            maxlength="11"
            placeholder="输入手机号"
            prefix-icon="el-icon-phone"
            v-model="phone"
            clearable
          ></el-input>
        </div>
        <div v-if="bindPhone">
          <el-input
            maxlength="4"
            type="number"
            placeholder="请输入验证码"
            prefix-icon="el-icon-lock"
            v-model="code"
            clearable
          >
            <template #append>
              <el-button :disabled="time !== 0" @click="getCode">{{ codeText }}</el-button>
            </template>
          </el-input>
        </div>
        <div class="tc">
          <el-button @click="handleRegister" type="primary">注册</el-button>
        </div>
        <el-divider></el-divider>
        <div class="links">
          <router-link to="/login">已有账号,去登陆</router-link>
        </div>
      </div>
    </login-panel>
  </div>
</template>
<script lang="ts">
import { PublicApi, UserApi } from '@/apis'
import { defineComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import loginPanel from '@components/loginPanel.vue'
import {
  rAccount, rMobilePhone, rPassword, rVerCode,
} from '@/utils/regExp'
import { useStore } from 'vuex'

export default defineComponent({
  components: {
    loginPanel,
  },
  setup() {
    const $store = useStore()
    const account = ref('')
    const pwd1 = ref('')
    const pwd2 = ref('')
    const phone = ref('')
    const code = ref('')
    const $router = useRouter()
    const bindPhone = ref(false)
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
      if (!rMobilePhone.test(phone.value)) {
        ElMessage.warning('手机号格式不正确')
        return
      }
      PublicApi.getCode(phone.value).then(() => {
        time.value = 120
        refreshCodeText()
        ElMessage.success('获取成功,请注意查看手机短信')
      })
    }
    const checkForm = () => {
      if (!rAccount.test(account.value)) {
        ElMessage.warning('帐号格式不正确(4-8位 数字字母)')
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
      if (bindPhone.value) {
        if (!rMobilePhone.test(phone.value)) {
          ElMessage.warning('手机号格式不正确')
          return false
        }
        if (!rVerCode.test(code.value)) {
          ElMessage.warning('验证码不正确(4位 数字)')
          return false
        }
      }
      return true
    }
    const handleRegister = () => {
      if (!checkForm()) {
        return
      }
      UserApi.register(account.value, pwd1.value, bindPhone.value, {
        phone: phone.value,
        code: code.value,
      }).then((res) => {
        const { token } = res.data
        $store.commit('user/setToken', token)
        ElMessage.success('注册成功')
        $router.replace({
          name: 'dashboard',
        })
      }).catch((err) => {
        const { code: c } = err
        const msg = '注册失败,未知错误'
        const options: any = {
          1001: '账号已存在',
          1002: '手机号已被注册',
          1003: '验证码不正确',
          1006: '手机号格式不正确',
        }
        ElMessage.error(options[c] || msg)
      })
    }
    return {
      account,
      pwd1,
      pwd2,
      bindPhone,
      phone,
      code,
      codeText,
      time,
      handleRegister,
      getCode,
    }
  },
})
</script>
<style scoped lang="scss">
.register {
  background-image: linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%);
  min-height: 100vh;
}

.inputArea {
  margin: 0 auto;
  max-width: 320px;
  > div {
    margin-top: 10px;
  }
}
.links {
  display: flex;
  justify-content: center;
  a {
    color: #409eff;
    margin-left: 10px;
  }
}
</style>
