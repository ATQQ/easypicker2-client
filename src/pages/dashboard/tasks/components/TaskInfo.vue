<template>
    <el-card class="task-item">
        <template #header>
            <div class="header">
                <span>{{ item.name }}</span>
                <div class="actions">
                    <el-button
                        circle
                        type="success"
                        icon="el-icon-edit-outline"
                        size="small"
                        title="编辑基本信息"
                        @click="$emit('edit', item)"
                    ></el-button>
                    <el-button
                        circle
                        type="primary"
                        icon="el-icon-share"
                        size="small"
                        title="分享"
                        @click="$emit('share', item.key)"
                    ></el-button>
                    <el-button
                        circle
                        type="danger"
                        icon="el-icon-delete"
                        size="small"
                        title="删除"
                        @click="$emit('delete', item.key)"
                    ></el-button>
                </div>
            </div>
        </template>

        <!-- 没有提交记录 -->
        <div class="body">
            <div class="empty">暂时没有提交记录...</div>
        </div>
    </el-card>
</template>
<script lang="ts">
import {
  defineComponent,
} from 'vue'

export default defineComponent({
  name: 'taskInfo',
  props: {
    item: {
      type: Object,
      required: true,
    },
  },
  setup() {
    return {}
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
        height: 60px;
        .empty {
            text-align: center;
            font-size: 12px;
            color: grey;
        }
    }
}
</style>
