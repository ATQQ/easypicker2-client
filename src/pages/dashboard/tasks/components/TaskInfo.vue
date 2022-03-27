<template>
    <el-card class="task-item">
        <template #header>
            <div class="header">
                <span>{{ item.name }}</span>
                <div class="actions">
                    <el-button
                        circle
                        type="warning"
                        :icon="Menu"
                        title="更多"
                        @click="$emit('more', item)"
                    ></el-button>
                    <el-button
                        circle
                        type="success"
                        :icon="Edit"
                        title="编辑基本信息"
                        @click="$emit('edit', item)"
                    ></el-button>
                    <el-button
                        circle
                        type="primary"
                        :icon="Share"
                        title="分享"
                        @click="$emit('share', item.key)"
                    ></el-button>
                    <el-button
                        circle
                        type="danger"
                        :icon="Delete"
                        title="删除"
                        @click="$emit('delete', item.key)"
                    ></el-button>
                </div>
            </div>
        </template>

        <!-- 没有提交记录 -->
        <div class="body">
            <div v-if="item.recentLog.length === 0" class="empty">暂时没有提交记录...</div>
            <ul v-else>
                <li v-for="(log,idx) in item.recentLog" :key="Number(idx)">
                    <span class="time">{{ formatDate(new Date(log.date)) }}</span>
                    <span class="name">{{ log.filename }}</span>
                </li>
            </ul>
        </div>
    </el-card>
</template>
<script lang="ts" setup>
import {
  Delete, Share, Menu, Edit,
} from '@element-plus/icons-vue'

import { formatDate } from '@/utils/stringUtil'

defineProps({
  item: {
    type: Object,
    required: true,
  },
})
</script>
<style scoped lang="scss">
.task-item {
    min-width: 400px;
    margin-top: 1em;
    .header {
        overflow: hidden;
        .actions {
            float: right;
            padding: 3px 0;
        }
    }

    .body {
        min-height: 30px;
        .empty {
            text-align: center;
            font-size: 12px;
            color: grey;
        }
        ul{
            font-size: 12px;
            color: grey;
            list-style: none;
            .time{
                margin-right: 10px;
            }
        }
    }
}
@media screen and (max-width:700px) {
  .task-item{
    min-width: 100%;
  }
}
</style>
