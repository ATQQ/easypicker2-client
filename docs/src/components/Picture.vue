<template>
  <el-image :src="src" :preview-src-list="[src]"/>
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
