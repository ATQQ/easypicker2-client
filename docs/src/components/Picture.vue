<script setup lang="ts">
defineProps({
  src: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <el-image :src="src" :preview-src-list="[src]" hide-on-click-modal />
</template>
