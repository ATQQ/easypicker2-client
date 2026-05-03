<script lang="ts" setup>
import { ChatDotRound } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { WishApi } from '@/apis'
import { useIsMobile } from '@/composables'

const OFFICIAL_SITE = 'https://ep2.sugarat.top/?feedback=1'

const isMobile = useIsMobile()
const $route = useRoute()
const dialogVisible = ref(false)
const submitting = ref(false)
const formData = reactive({
  title: '',
  des: '',
  contact: '',
})

const host = window.location.hostname
const canSubmitFeedback = computed(() => {
  const isLocal = ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(host)
  const isSugaratDomain = host === 'sugarat.top' || host.endsWith('.sugarat.top')
  return isLocal || isSugaratDomain
})

function openFeedback() {
  dialogVisible.value = true
}

function resetForm() {
  formData.title = ''
  formData.des = ''
  formData.contact = ''
}

function validateForm() {
  if (!formData.title.trim()) {
    ElMessage.error('请填写问题标题')
    return false
  }
  if (!formData.des.trim()) {
    ElMessage.error('请填写问题描述')
    return false
  }
  return true
}

function getFeedbackPayload() {
  return {
    title: formData.title.trim(),
    des: [
      formData.des.trim(),
      '',
      `页面地址：${window.location.href}`,
      `浏览器：${window.navigator.userAgent}`,
    ].join('\n'),
    contact: formData.contact.trim(),
  }
}

function handleSubmit() {
  if (!validateForm())
    return

  submitting.value = true
  WishApi.addWish(getFeedbackPayload())
    .then(() => {
      ElMessage.success('提交成功，感谢你的反馈')
      dialogVisible.value = false
      resetForm()
    })
    .finally(() => {
      submitting.value = false
    })
}

function openOfficialSite() {
  window.open(OFFICIAL_SITE, '_blank')
}

onMounted(() => {
  if ($route.query.feedback === '1') {
    openFeedback()
  }
})
</script>

<template>
  <div class="feedback-entry">
    <button class="feedback-button" type="button" title="页面&功能问题反馈" @click="openFeedback">
      <el-icon>
        <ChatDotRound />
      </el-icon>
      <span>反馈</span>
    </button>

    <el-dialog
      v-model="dialogVisible"
      title="页面&功能问题反馈"
      :fullscreen="isMobile"
      width="560px"
    >
      <template v-if="canSubmitFeedback">
        <el-alert
          title="反馈会进入需求管理列表，管理员可在平台后台统一查看和处理。"
          type="info"
          show-icon
          :closable="false"
        />
        <el-form class="feedback-form" :model="formData" label-width="88px">
          <el-form-item label="问题标题">
            <el-input
              v-model="formData.title"
              maxlength="80"
              show-word-limit
              placeholder="一句话描述遇到的问题或建议"
            />
          </el-form-item>
          <el-form-item label="详细描述">
            <el-input
              v-model="formData.des"
              :rows="6"
              maxlength="800"
              show-word-limit
              type="textarea"
              placeholder="请描述复现步骤、期望效果、实际效果等信息"
            />
          </el-form-item>
          <el-form-item label="联系方式">
            <el-input
              v-model="formData.contact"
              maxlength="120"
              show-word-limit
              placeholder="邮箱、QQ、微信等，方便需要时联系你"
            />
          </el-form-item>
        </el-form>
      </template>
      <template v-else>
        <el-alert
          title="当前站点看起来是第三方私有化部署。为避免反馈进入部署者自己的后台，请前往官方站点提交问题。"
          type="warning"
          show-icon
          :closable="false"
        />
        <div class="official-guide">
          <p>官方反馈入口会将问题提交到 Easypicker 官方平台，方便作者统一查看。</p>
          <el-button type="primary" @click="openOfficialSite">
            去 ep2.sugarat.top 反馈
          </el-button>
        </div>
      </template>

      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          v-if="canSubmitFeedback"
          type="primary"
          :loading="submitting"
          @click="handleSubmit"
        >
          提交反馈
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.feedback-button {
  position: fixed;
  right: 18px;
  bottom: 88px;
  z-index: 900;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 12px;
  color: var(--el-color-primary);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 999px;
  box-shadow: var(--el-box-shadow-light);
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;

  &:hover {
    color: #fff;
    background: var(--el-color-primary);
    border-color: var(--el-color-primary);
    transform: translateY(-1px);
    box-shadow: var(--el-box-shadow);
  }

  .el-icon {
    font-size: 16px;
  }
}

.feedback-form {
  margin-top: 18px;
}

.official-guide {
  padding: 18px 0 4px;

  p {
    margin: 0 0 16px;
    color: #606266;
    line-height: 1.7;
  }
}

@media screen and (max-width: 700px) {
  .feedback-button {
    right: 12px;
    bottom: 74px;
    width: 42px;
    height: 42px;
    justify-content: center;
    padding: 0;
    border-radius: 50%;

    span {
      display: none;
    }

    .el-icon {
      font-size: 18px;
    }
  }

  .feedback-form :deep(.el-form-item) {
    display: block;
  }

  .feedback-form :deep(.el-form-item__label) {
    justify-content: flex-start;
    width: auto !important;
  }
}
</style>
