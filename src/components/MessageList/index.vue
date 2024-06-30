<script lang="ts" setup>
import { reactive, ref, watch } from 'vue'
import { formatDate } from '@/utils/stringUtil'
import { SuperUserApi } from '@/apis'
import { useIsMobile } from '@/composables'

const props = defineProps<{
  data: SuperUserApiTypes.MessageItem[]
  autoShow?: boolean
}>()

const dialogMessage = reactive({
  show: false,
  title: '系统消息',
  text: '内容',
})
const activeMessage = ref<SuperUserApiTypes.MessageItem>(null)
function handleViewDialogMessage(v: SuperUserApiTypes.MessageItem) {
  activeMessage.value = v
  dialogMessage.text = v.text
  // TODO: 魔法数字问题
  // TODO：支持更多的消息类型
  dialogMessage.title = v.type === 0 ? '【系统消息】' : '【私信】'
  dialogMessage.show = true
}

function readMessage() {
  if (activeMessage.value.read) {
    dialogMessage.show = false
    return
  }
  SuperUserApi.readMessage(activeMessage.value.id).then(() => {
    activeMessage.value.read = true
    dialogMessage.show = false
  })
}

watch(
  () => props.data.length,
  () => {
    if (!props.autoShow) {
      return
    }
    const showItem = props.data.find(v => !v.read)
    if (showItem) {
      handleViewDialogMessage(showItem)
    }
  },
)

const isMobile = useIsMobile()
</script>

<template>
  <div v-if="!data.length" class="empty">
    暂无更多消息 ღ( ´･ᴗ･` )比心
  </div>
  <ul class="message-list">
    <li
      v-for="d in data"
      :key="d.id"
      :class="{
        read: d.read,
      }"
      @click="handleViewDialogMessage(d)"
    >
      <p class="text">
        {{ d.text }}
      </p>
      <p class="date">
        {{ formatDate(new Date(d.date)) }}
      </p>
    </li>
  </ul>
  <el-dialog
    v-model="dialogMessage.show"
    center
    show-close
    append-to-body
    :close-on-click-modal="false"
    :title="dialogMessage.title"
    width="30%"
    :fullscreen="isMobile"
  >
    <div class="message-text" v-html="dialogMessage.text" />
    <template #footer>
      <p class="dialog-date">
        时间：{{ formatDate(new Date(activeMessage.date)) }}
      </p>
      <span>
        <el-button
          type="default"
          @click="
            () => {
              dialogMessage.show = false
            }
          "
        >
          下次提醒
        </el-button>
        <el-button type="primary" @click="readMessage"> 确定 </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.message-list {
  list-style: none;
  max-height: 500px;
  overflow-y: scroll;
  li {
    border-bottom: 1px solid #ddd;
    padding: 10px;
    cursor: pointer;
    &.read {
      opacity: 0.5;
      &:hover {
        opacity: 0.9;
      }
    }
    &:last-child {
      border-bottom: none;
    }

    p.text {
      font-size: 16px;
      display: -webkit-box;
      overflow: hidden;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    p.date {
      font-size: 14px;
      margin-top: 4px;
    }
  }
}
.empty {
  text-align: center;
  padding: 10px;
}

.dialog-date {
  font-size: 14px;
  text-align: right;
  padding: 10px;
  color: grey;
}
</style>

<style lang="scss">
.message-text {
  overflow-y: scroll;
  max-height: 500px;
  ul,
  ol {
    list-style: none;
  }
}
</style>
