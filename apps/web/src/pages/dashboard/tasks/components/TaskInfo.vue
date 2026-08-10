<script lang="ts" setup>
import { CopyDocument, Delete, Edit, Menu, More, Share } from '@element-plus/icons-vue'

import { formatDate } from '@/utils/stringUtil'

defineProps<{
  item: TaskApiTypes.TaskItem
}>()

defineEmits<{
  more: [item: TaskApiTypes.TaskItem]
  edit: [item: TaskApiTypes.TaskItem]
  copy: [item: TaskApiTypes.TaskItem]
  share: [key: string]
  delete: [key: string, isTrash: boolean]
}>()
</script>

<template>
  <el-card class="task-item">
    <template #header>
      <div class="header">
        <span class="ellipsis">{{ item.name }}</span>
        <div class="actions">
          <el-button
            circle
            type="warning"
            :icon="Menu"
            title="更多"
            @click="$emit('more', item)"
          />
          <el-button
            circle
            type="success"
            :icon="Share"
            title="分享"
            @click="$emit('share', item.key)"
          />
          <el-dropdown trigger="click" placement="bottom-end">
            <el-button circle :icon="More" title="更多操作" />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :icon="Edit" @click="$emit('edit', item)">
                  编辑基本信息
                </el-dropdown-item>
                <el-dropdown-item :icon="CopyDocument" @click="$emit('copy', item)">
                  复制任务
                </el-dropdown-item>
                <el-dropdown-item
                  :icon="Delete"
                  divided
                  @click="$emit('delete', item.key, item.category === 'trash')"
                >
                  删除任务
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </template>

    <!-- 没有提交记录 -->
    <div class="body">
      <div v-if="item.recentLog.length === 0" class="empty">
        暂时没有提交记录...
      </div>
      <ul v-else>
        <li class="check-files">
          <strong>近 {{ item.recentLog.length }} 条提交记录</strong>
          <router-link :to="`/dashboard/files?task=${item.key}`">
            查看详情
          </router-link>
        </li>
        <li
          v-for="(log, idx) in item.recentLog"
          :key="Number(idx)"
          class="ellipsis"
        >
          <span class="time">{{ formatDate(new Date(log.date)) }}</span>
          <span class="name">{{ log.filename }}</span>
        </li>
      </ul>
    </div>
  </el-card>
</template>

<style scoped lang="scss">
.task-item {
  min-width: 400px;
  margin-top: 1em;

  .header {
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: nowrap;

    .actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      padding: 3px 0;
      margin-left: 20px;
    }
  }

  .body {
    min-height: 30px;

    .empty {
      text-align: center;
      font-size: 12px;
      color: grey;
    }

    ul {
      font-size: 12px;
      color: grey;
      list-style: none;

      .time {
        margin-right: 10px;
      }
    }
  }
}

@media screen and (max-width: 700px) {
  .task-item {
    min-width: 100%;
  }
}

.check-files {
  display: flex;
  justify-content: space-between;
  align-items: center;
  a {
    color: #409eff;
  }
}
</style>
