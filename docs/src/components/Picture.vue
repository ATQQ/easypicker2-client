<template>
  <el-image :src="src" :preview-src-list="[src]" hide-on-click-modal/>
</template>
<script setup lang="ts">
import { ElImage } from 'element-plus'

defineProps({
  src: {
    type: String,
    default: '',
  },
})
</script>
