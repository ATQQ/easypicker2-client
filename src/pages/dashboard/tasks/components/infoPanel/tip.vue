<template>
    <div class="tip tc">
        <div>
            <slot></slot>
        </div>
        <div v-if="imgs?.length" class="preview">
            <el-image
                class="img-container"
                :src="imgs[0]"
                :preview-src-list="imgs"
                :initial-index="0"
                fit="cover"
            />
            <el-icon class="icon">
                <opportunity />
            </el-icon>
        </div>
    </div>
</template>
<script setup lang="ts">
import { Opportunity } from '@element-plus/icons-vue'

defineProps<{
    imgs?: string[]
}>()

</script>

<style scoped>
.tip {
    color: #909399;
    padding-bottom: 10px;
    font-size: 12px;
    display: flex;
    justify-content: center;
    left: 0;
    top: 4px;
}
.preview{
    position: relative;
}
.icon {
    position: absolute;
    pointer-events: none;
    background-color: #fff;
    left: 0;
    top: 1px;
    font-size: 14px;
    color: #53a8ff;
}
.img-container {
    width: 10px;
    height: 10px;
}
</style>
