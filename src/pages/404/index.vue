<template>
    <div>
        <h1>404 not find，糟糕页面走丢了，3s后回到首页<router-link to="/">回到首页</router-link></h1>
    </div>
</template>
<script lang="ts">
import { defineComponent, onMounted } from 'vue'
import { useRoute } from 'vue-router'

export default defineComponent({
  setup: () => {
    onMounted(() => {
      const route = useRoute()
    })
  },
})
</script>
