<template>
    <div>
        <h1>{{title}}</h1>
        <div>
          <router-link to="tasks">任务管理</router-link>
          <router-link to="files">文件管理</router-link>
        </div>
        <router-view></router-view>
    </div>
</template>
<script lang="ts">
import { defineComponent, ref } from 'vue'

export default defineComponent({
  setup() {
    const title = ref('标题')
    return {
      title,
    }
  },
})
</script>
<style scoped>

</style>
