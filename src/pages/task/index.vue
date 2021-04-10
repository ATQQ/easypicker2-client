<template>
  <div>
      <h1>{{title}}</h1>

  </div>
</template>
<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

export default defineComponent({
  setup() {
    const title = ref('标题')
    const $route = useRoute()
    onMounted(() => {
      title.value = $route.params.key as string
    })
    return {
      title,
    }
  },
})
</script>
<style scoped>

</style>
