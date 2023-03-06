<script lang="ts" setup>
import { Bell } from '@element-plus/icons-vue'
import { computed, reactive, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { SuperUserApi } from '@/apis'
import MessageList from '@/components/MessageList/index.vue'

const activeTab = ref<'all' | 'no'>('all')
const messageData = reactive<SuperUserApiTypes.MessageItem[]>([])

const noReadMessage = computed(() => messageData.filter((v) => !v.read))
const route = useRoute()
onMounted(() => {
  if (route.name !== 'config') {
    SuperUserApi.getMessageList().then((v) => {
      messageData.push(...v.data)
    })
  }
})
</script>
<template>
  <div class="message-panel">
    <el-popover placement="bottom-end" :width="375" trigger="hover">
      <template #reference>
        <el-badge :value="noReadMessage.length || ''" :max="99">
          <el-button :icon="Bell" circle />
        </el-badge>
      </template>
      <div>
        <el-tabs v-model="activeTab">
          <el-tab-pane :label="`未读 ${noReadMessage.length || ''}`" name="no">
            <message-list auto-show :data="noReadMessage" />
          </el-tab-pane>
          <el-tab-pane :label="`全部 ${messageData.length || ''}`" name="all">
            <message-list :data="messageData" />
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-popover>
  </div>
</template>
<style lang="scss" scoped>
.message-panel {
  margin-right: 10px;
}
</style>
