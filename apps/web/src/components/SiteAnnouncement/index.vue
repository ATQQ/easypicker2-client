<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useIsMobile, useSiteConfig } from '@/composables'

const { value: siteConfig } = useSiteConfig()
const isMobile = useIsMobile()
const modalVisible = ref(false)
const topDismissedKey = ref('')

const topNotice = computed(() => siteConfig.value.announcementTop)
const modalNotice = computed(() => siteConfig.value.announcementModal)

function hashText(text: string) {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return hash.toString(36)
}

function announcementKey(type: 'top' | 'modal', data: unknown) {
  return `ep-announcement-${type}-${hashText(JSON.stringify(data || {}))}`
}

const topNoticeKey = computed(() => announcementKey('top', topNotice.value))
const modalNoticeKey = computed(() => announcementKey('modal', modalNotice.value))

const showTopNotice = computed(() => {
  const notice = topNotice.value
  if (!notice?.enabled || !notice.content?.trim())
    return false
  if (!notice.closable)
    return true
  return topDismissedKey.value !== topNoticeKey.value
})

const topNoticeClass = computed(() => `site-announcement--${topNotice.value?.theme || 'info'}`)
const modalNoticeClass = computed(() => `site-announcement-modal--${modalNotice.value?.theme || 'info'}`)

function refreshTopDismissedState() {
  topDismissedKey.value = localStorage.getItem(topNoticeKey.value) === 'closed'
    ? topNoticeKey.value
    : ''
}

function closeTopNotice() {
  localStorage.setItem(topNoticeKey.value, 'closed')
  topDismissedKey.value = topNoticeKey.value
}

function getModalShowTimes() {
  const times = Number(modalNotice.value?.showTimes || 1)
  return Number.isFinite(times) && times > 0 ? Math.floor(times) : 1
}

function getModalShownCount() {
  return Number(localStorage.getItem(modalNoticeKey.value) || 0)
}

function tryOpenModal() {
  const notice = modalNotice.value
  if (!notice?.enabled || !notice.content?.trim()) {
    modalVisible.value = false
    return
  }
  const shownCount = getModalShownCount()
  if (shownCount >= getModalShowTimes())
    return
  localStorage.setItem(modalNoticeKey.value, `${shownCount + 1}`)
  modalVisible.value = true
}

watch(topNoticeKey, refreshTopDismissedState, { immediate: true })
watch(modalNoticeKey, tryOpenModal, { immediate: true })
</script>

<template>
  <div
    v-if="showTopNotice"
    class="site-announcement site-announcement-top"
    :class="topNoticeClass"
  >
    <div class="site-announcement-top__content">
      <strong v-if="topNotice?.title">{{ topNotice.title }}</strong>
      <span>{{ topNotice?.content }}</span>
    </div>
    <el-button
      v-if="topNotice?.closable"
      text
      size="small"
      class="site-announcement-top__close"
      @click="closeTopNotice"
    >
      关闭
    </el-button>
  </div>

  <el-dialog
    v-model="modalVisible"
    :title="modalNotice?.title || '通告'"
    :fullscreen="isMobile"
    width="460px"
    center
  >
    <div class="site-announcement-modal" :class="modalNoticeClass">
      <div class="site-announcement-modal__content">
        {{ modalNotice?.content }}
      </div>
    </div>
    <template #footer>
      <el-button type="primary" @click="modalVisible = false">
        {{ modalNotice?.confirmText || '知道了' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.site-announcement-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 40px;
  padding: 8px 16px;
  box-sizing: border-box;
  border-bottom: 1px solid transparent;
  font-size: 14px;
  line-height: 1.5;
}

.site-announcement-top__content {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  gap: 8px;
  text-align: center;

  strong {
    flex-shrink: 0;
  }

  span {
    white-space: pre-line;
    word-break: break-word;
  }
}

.site-announcement-top__close {
  flex-shrink: 0;
}

.site-announcement--info {
  border-color: #d9ecff;
  background: #ecf5ff;
  color: #1f5f99;
}

.site-announcement--success {
  border-color: #e1f3d8;
  background: #f0f9eb;
  color: #2f7d32;
}

.site-announcement--warning {
  border-color: #faecd8;
  background: #fdf6ec;
  color: #9a5b13;
}

.site-announcement--danger {
  border-color: #fde2e2;
  background: #fef0f0;
  color: #a13030;
}

.site-announcement-modal {
  padding: 14px;
  border-radius: 6px;
}

.site-announcement-modal__content {
  color: #303133;
  font-size: 15px;
  line-height: 1.8;
  white-space: pre-line;
  word-break: break-word;
}

.site-announcement-modal--info {
  background: #f5f9ff;
}

.site-announcement-modal--success {
  background: #f6fbf3;
}

.site-announcement-modal--warning {
  background: #fffaf2;
}

.site-announcement-modal--danger {
  background: #fff6f6;
}

@media (max-width: 640px) {
  .site-announcement-top {
    align-items: flex-start;
    justify-content: space-between;
    padding: 10px 12px;
  }

  .site-announcement-top__content {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
    text-align: left;
  }
}
</style>
