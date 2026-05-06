<script setup lang="ts">
import loginPanel from '@components/loginPanel.vue'
import { Lock, Phone, QuestionFilled, User } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { PublicApi, UserApi } from '@/apis'
import { useSiteConfig } from '@/composables'
import { rAccount, rEmail, rMobilePhone, rPassword, rVerCode } from '@/utils/regExp'

const bindPhone = ref(false)
const bindWithEmail = ref(false)
const { value: siteConfig } = useSiteConfig()
const supportEmailCodeLogin = computed(() => Boolean(siteConfig.value.supportEmailCodeLogin))
watch(siteConfig, () => {
  if (siteConfig.value.needBindPhone) {
    bindPhone.value = true
  }
})
const $store = useStore()
const account = ref('')
const pwd1 = ref('')
const pwd2 = ref('')
const phone = ref('')
const code = ref('')
const email = ref('')
const emailCode = ref('')
const $router = useRouter()
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

function getEmailRegCode() {
  if (!rEmail.test(email.value.trim())) {
    ElMessage.warning('邮箱格式不正确')
    return
  }
  PublicApi.getEmailCode(email.value.trim()).then(() => {
    time.value = 120
    refreshCodeText()
    ElMessage.success('获取成功,请查收邮件')
  }).catch((err) => {
    const { code: c } = err
    const options: Record<number, string> = {
      1015: '邮箱格式不正确',
      1016: '邮箱已被注册',
    }
    ElMessage.error(options[c] || '发送失败')
  })
}
function checkForm() {
  if (!rAccount.test(account.value)) {
    ElMessage.warning('帐号格式不正确(4-11位 数字字母)')
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
  if (siteConfig.value.needBindPhone && !bindPhone.value && !bindWithEmail.value) {
    ElMessage.warning('请绑定手机号或邮箱后再注册')
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
  if (bindWithEmail.value) {
    if (!rEmail.test(email.value.trim())) {
      ElMessage.warning('邮箱格式不正确')
      return false
    }
    if (!rVerCode.test(emailCode.value)) {
      ElMessage.warning('邮箱验证码不正确(4位 数字)')
      return false
    }
  }
  return true
}
function handleRegister() {
  if (!checkForm()) {
    return
  }
  UserApi.register({
    account: account.value,
    pwd: pwd1.value,
    bindPhone: bindPhone.value,
    phone: phone.value,
    code: code.value,
    bindWithEmail: bindWithEmail.value,
    email: email.value.trim(),
    emailCode: emailCode.value,
  })
    .then((res) => {
      const { token } = res.data
      $store.commit('user/setToken', token)
      ElMessage.success('注册成功')
      $router.replace({
        name: 'dashboard',
      })
    })
    .catch((err) => {
      const { code: c } = err
      const msg = '注册失败,未知错误'
      const options: any = {
        1001: '账号已存在',
        1002: '手机号已被注册',
        1003: '验证码不正确',
        1004: '密码格式不正确',
        1006: '手机号格式不正确',
        1011: '系统暂不开放注册',
        1012: '必须绑定手机号或邮箱',
        1015: '邮箱格式不正确',
        1016: '邮箱已被注册',
      }
      ElMessage.error(options[c] || msg)
    })
}
</script>

<template>
  <div class="register">
    <login-panel>
      <div class="inputArea">
        <div>
          <el-input
            v-model="account"
            maxlength="32"
            placeholder="输入账号"
            :prefix-icon="User"
            clearable
          />
        </div>
        <div>
          <el-input
            v-model="pwd1"
            maxlength="16"
            minlength="6"
            type="password"
            placeholder="请输入密码"
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
            placeholder="请再次输入密码"
            :prefix-icon="Lock"
            show-password
            clearable
          />
        </div>
        <div class="tc">
          <el-checkbox v-model="bindPhone" :disabled="siteConfig.needBindPhone">
            绑定手机
          </el-checkbox>
          <el-tooltip
            effect="dark"
            content="可用于修改/找回密码"
            placement="top-start"
          >
            <el-icon :size="16">
              <QuestionFilled />
            </el-icon>
          </el-tooltip>
        </div>
        <div v-if="bindPhone">
          <el-input
            v-model="phone"
            maxlength="11"
            placeholder="输入手机号"
            :prefix-icon="Phone"
            clearable
          />
        </div>
        <div v-if="bindPhone">
          <el-input
            v-model="code"
            maxlength="4"
            type="number"
            placeholder="请输入验证码"
            :prefix-icon="Lock"
            clearable
          >
            <template #append>
              <el-button :disabled="time !== 0" @click="getCode">
                {{
                  codeText
                }}
              </el-button>
            </template>
          </el-input>
        </div>
        <div class="tc bind-email-line">
          <el-checkbox
            v-if="supportEmailCodeLogin"
            v-model="bindWithEmail"
          >
            绑定邮箱
          </el-checkbox>
          <el-tooltip
            v-if="supportEmailCodeLogin"
            effect="dark"
            content="需站点已配置 SMTP；可用于找回密码与邮件通知"
            placement="top-start"
          >
            <el-icon :size="16">
              <QuestionFilled />
            </el-icon>
          </el-tooltip>
        </div>
        <div v-if="bindWithEmail">
          <el-input
            v-model="email"
            placeholder="输入邮箱"
            clearable
          />
        </div>
        <div v-if="bindWithEmail">
          <el-input
            v-model="emailCode"
            maxlength="4"
            type="number"
            placeholder="请输入邮箱验证码"
            :prefix-icon="Lock"
            clearable
          >
            <template #append>
              <el-button :disabled="time !== 0" @click="getEmailRegCode">
                {{ codeText }}
              </el-button>
            </template>
          </el-input>
        </div>
        <div class="tc">
          <el-button type="primary" @click="handleRegister">
            注册
          </el-button>
        </div>
        <el-divider />
        <div class="links">
          <router-link to="/login">
            已有账号,去登陆
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
