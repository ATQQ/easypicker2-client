<script lang="ts" setup>
import {
  ChatDotSquare,
  Lock,
  Message,
  Refresh,
  User,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { PublicApi, UserApi } from '@/apis'
import { useSiteConfig } from '@/composables'
import { VERIFY_CODE_EXPIRE_SECONDS } from '@/constants'
import { rEmail, rPassword, rVerCode } from '@/utils/regExp'
import { formatDate } from '@/utils/stringUtil'

const $router = useRouter()
const $store = useStore()
const { value: siteConfig } = useSiteConfig()
const supportEmailFeature = computed(() => Boolean(siteConfig.value.supportEmailCodeLogin))

const loading = ref(false)
const profile = reactive<UserApiTypes.UserProfile>({
  account: '',
  phone: '',
  joinTime: '',
  loginTime: '',
  loginCount: 0,
  email: '',
  emailVerified: false,
  notifyOnSubmit: false,
})

const bindForm = reactive({
  email: '',
  code: '',
})
const resetForm = reactive({
  code: '',
  pwd1: '',
  pwd2: '',
})

function loadProfile() {
  loading.value = true
  UserApi.getProfile()
    .then((res) => {
      Object.assign(profile, res.data)
      bindForm.email = profile.email || ''
    })
    .finally(() => {
      loading.value = false
    })
}

function createCountdown(text: typeof bindCodeText, time: typeof bindCodeTime) {
  if (time.value === 0) {
    text.value = '获取验证码'
    return
  }
  text.value = `${time.value}s`
  time.value -= 1
  setTimeout(createCountdown, 1000, text, time)
}

const bindCodeText = ref('获取验证码')
const bindCodeTime = ref(0)
function sendBindEmailCode() {
  const email = bindForm.email.trim()
  if (!supportEmailFeature.value) {
    ElMessage.warning('邮箱功能未开启')
    return
  }
  if (profile.emailVerified) {
    ElMessage.warning('邮箱已绑定')
    return
  }
  if (!rEmail.test(email)) {
    ElMessage.warning('邮箱格式不正确')
    return
  }
  PublicApi.getEmailCode(email).then(() => {
    bindCodeTime.value = VERIFY_CODE_EXPIRE_SECONDS
    createCountdown(bindCodeText, bindCodeTime)
    ElMessage.success('获取成功,请查收邮件')
  }).catch((err) => {
    const options: Record<number, string> = {
      1015: '邮箱格式不正确',
      1014: '邮箱功能未开启',
    }
    ElMessage.error(options[err?.code] || '发送失败')
  })
}

function bindEmail() {
  const email = bindForm.email.trim()
  if (!rEmail.test(email)) {
    ElMessage.warning('邮箱格式不正确')
    return
  }
  if (!rVerCode.test(bindForm.code)) {
    ElMessage.warning('验证码格式不正确')
    return
  }
  UserApi.bindProfileEmail(email, bindForm.code).then(() => {
    ElMessage.success('绑定成功')
    bindForm.code = ''
    loadProfile()
  }).catch((err) => {
    const options: Record<number, string> = {
      1003: '验证码不正确',
      1015: '邮箱格式不正确',
      1016: '邮箱已被绑定',
    }
    ElMessage.error(options[err?.code] || '绑定失败')
  })
}

const resetCodeText = ref('获取验证码')
const resetCodeTime = ref(0)
function sendResetEmailCode() {
  if (!supportEmailFeature.value) {
    ElMessage.warning('邮箱功能未开启')
    return
  }
  if (!profile.emailVerified || !profile.email) {
    ElMessage.warning('请先绑定邮箱')
    return
  }
  PublicApi.getEmailCode(profile.email).then(() => {
    resetCodeTime.value = VERIFY_CODE_EXPIRE_SECONDS
    createCountdown(resetCodeText, resetCodeTime)
    ElMessage.success('获取成功,请查收邮件')
  }).catch((err) => {
    const options: Record<number, string> = {
      1014: '邮箱功能未开启',
      1017: '该邮箱未绑定账号',
    }
    ElMessage.error(options[err?.code] || '发送失败')
  })
}

function resetPassword() {
  if (!profile.emailVerified) {
    ElMessage.warning('请先绑定邮箱')
    return
  }
  if (!rVerCode.test(resetForm.code)) {
    ElMessage.warning('验证码格式不正确')
    return
  }
  if (!rPassword.test(resetForm.pwd1)) {
    ElMessage.warning('密码格式不正确(6-16位 支持字母/数字/下划线)')
    return
  }
  if (resetForm.pwd1 !== resetForm.pwd2) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }
  UserApi.resetProfilePassword(resetForm.code, resetForm.pwd1).then(() => {
    ElMessage.success('密码已重置，请重新登录')
    $store.commit('user/setToken', null)
    $store.commit('user/setSystem', null)
    $router.replace({ name: 'login' })
  }).catch((err) => {
    const options: Record<number, string> = {
      1003: '验证码不正确',
      1004: '密码格式不正确',
      1018: '邮箱未验证',
    }
    ElMessage.error(options[err?.code] || '重置失败')
  })
}

function saveNotify(val: boolean) {
  if (!profile.emailVerified) {
    ElMessage.warning('请先绑定邮箱')
    return
  }
  UserApi.setProfileNotify(val).then(() => {
    profile.notifyOnSubmit = val
    ElMessage.success('已更新')
  })
}

onMounted(() => {
  loadProfile()
})
</script>

<template>
  <div class="profile-page">
    <div v-loading="loading" class="profile-panel">
      <div class="profile-header">
        <div>
          <h2>个人设置</h2>
          <p>{{ profile.account }}</p>
        </div>
        <el-button :icon="Refresh" @click="loadProfile">
          刷新
        </el-button>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <el-icon><User /></el-icon>
          <span>账号</span>
          <strong>{{ profile.account || '-' }}</strong>
        </div>
        <div class="info-item">
          <el-icon><Message /></el-icon>
          <span>邮箱</span>
          <strong>{{ profile.emailVerified ? profile.email : '未绑定' }}</strong>
        </div>
        <div class="info-item">
          <span>手机号</span>
          <strong>{{ profile.phone ? `尾号 ${profile.phone}` : '未绑定' }}</strong>
        </div>
        <div class="info-item">
          <span>注册时间</span>
          <strong>{{ profile.joinTime ? formatDate(new Date(profile.joinTime)) : '-' }}</strong>
        </div>
        <div class="info-item">
          <span>最后登录</span>
          <strong>{{ profile.loginTime ? formatDate(new Date(profile.loginTime)) : '-' }}</strong>
        </div>
        <div class="info-item">
          <span>登录次数</span>
          <strong>{{ profile.loginCount }}</strong>
        </div>
      </div>
    </div>

    <div class="settings-grid">
      <section class="profile-panel">
        <div class="section-title">
          <h3>绑定邮箱</h3>
          <el-tag v-if="profile.emailVerified" type="success">
            已绑定
          </el-tag>
        </div>
        <div v-if="profile.emailVerified" class="bound-email">
          {{ profile.email }}
        </div>
        <el-form v-else label-position="top" :model="bindForm">
          <el-form-item label="邮箱">
            <el-input
              v-model="bindForm.email"
              maxlength="128"
              :prefix-icon="Message"
              clearable
              placeholder="请输入邮箱"
              :disabled="!supportEmailFeature"
            />
          </el-form-item>
          <el-form-item label="验证码">
            <el-input
              v-model="bindForm.code"
              maxlength="4"
              :prefix-icon="ChatDotSquare"
              clearable
              placeholder="请输入验证码"
              :disabled="!supportEmailFeature"
            >
              <template #append>
                <el-button
                  :disabled="bindCodeTime !== 0 || !supportEmailFeature"
                  @click="sendBindEmailCode"
                >
                  {{ bindCodeText }}
                </el-button>
              </template>
            </el-input>
          </el-form-item>
          <el-button type="primary" :disabled="!supportEmailFeature" @click="bindEmail">
            绑定邮箱
          </el-button>
        </el-form>
      </section>

      <section v-if="supportEmailFeature" class="profile-panel">
        <div class="section-title">
          <div>
            <h3>邮箱与提交通知</h3>
            <p>有新提交时向你的邮箱发送提醒（需已验证邮箱）</p>
          </div>
        </div>
        <div v-if="profile.emailVerified" class="notify-row">
          <div>
            <span>接收邮箱</span>
            <strong>{{ profile.email }}</strong>
          </div>
          <span class="notify-toggle">
            邮件通知
            <el-switch
              :model-value="profile.notifyOnSubmit"
              @update:model-value="saveNotify"
            />
          </span>
        </div>
        <div v-else class="notify-empty">
          未绑定邮箱，绑定后可开启新提交通知
        </div>
      </section>

      <section class="profile-panel">
        <div class="section-title">
          <h3>重置登录密码</h3>
        </div>
        <el-form label-position="top" :model="resetForm">
          <el-form-item label="邮箱">
            <el-input
              :model-value="profile.emailVerified ? profile.email : ''"
              :prefix-icon="Message"
              disabled
              placeholder="请先绑定邮箱"
            />
          </el-form-item>
          <el-form-item label="验证码">
            <el-input
              v-model="resetForm.code"
              maxlength="4"
              :prefix-icon="ChatDotSquare"
              clearable
              placeholder="请输入验证码"
              :disabled="!profile.emailVerified"
            >
              <template #append>
                <el-button
                  :disabled="resetCodeTime !== 0 || !profile.emailVerified || !supportEmailFeature"
                  @click="sendResetEmailCode"
                >
                  {{ resetCodeText }}
                </el-button>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item label="新密码">
            <el-input
              v-model="resetForm.pwd1"
              maxlength="16"
              minlength="6"
              type="password"
              :prefix-icon="Lock"
              show-password
              clearable
              placeholder="请输入新密码"
              :disabled="!profile.emailVerified"
            />
          </el-form-item>
          <el-form-item label="确认密码">
            <el-input
              v-model="resetForm.pwd2"
              maxlength="16"
              minlength="6"
              type="password"
              :prefix-icon="Lock"
              show-password
              clearable
              placeholder="请再次输入新密码"
              :disabled="!profile.emailVerified"
            />
          </el-form-item>
          <el-button type="primary" :disabled="!profile.emailVerified" @click="resetPassword">
            重置密码
          </el-button>
        </el-form>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.profile-page {
  width: min(1120px, calc(100% - 24px));
  margin: 20px auto;
}

.profile-panel {
  padding: 18px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 8%);
  box-sizing: border-box;
}

.profile-header,
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  h2,
  h3,
  p {
    margin: 0;
  }

  p {
    margin-top: 4px;
    color: #909399;
    font-size: 13px;
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.info-item {
  min-height: 82px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  box-sizing: border-box;

  span {
    color: #909399;
    font-size: 13px;
  }

  strong {
    color: #303133;
    font-size: 15px;
    word-break: break-all;
  }

  .el-icon {
    color: #409eff;
  }
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.bound-email {
  margin-top: 18px;
  padding: 14px;
  color: #303133;
  background-color: #f5f7fa;
  border-radius: 4px;
  word-break: break-all;
}

.notify-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 18px;
  padding: 14px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  box-sizing: border-box;

  div {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  span {
    color: #909399;
    font-size: 13px;
  }

  strong {
    color: #303133;
    font-size: 15px;
    word-break: break-all;
  }
}

.notify-toggle {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  color: #606266;
  font-size: 14px;
}

.notify-empty {
  margin-top: 18px;
  padding: 14px;
  border-radius: 4px;
  background-color: #f5f7fa;
  color: #606266;
  font-size: 14px;
}

@media screen and (max-width: 700px) {
  .profile-page {
    width: calc(100% - 20px);
    margin-top: 62px;
  }

  .info-grid,
  .settings-grid {
    grid-template-columns: 1fr;
  }

  .notify-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
