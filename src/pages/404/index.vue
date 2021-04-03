<template>
    <div>
        <h1>404 not find</h1>
    </div>
</template>
<script lang="ts">
import { defineComponent, onMounted } from 'vue'
import { useRoute } from 'vue-router'

export default defineComponent({
  setup: () => {
    onMounted(() => {
      const route = useRoute()
      console.log(route.params)
    })
  },
})
</script>
