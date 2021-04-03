<template>
    <div>
        <HelloWorld msg="Hello Vue 3 + TypeScript + Vite" />
    </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import HelloWorld from '../../components/HelloWorld.vue'

export default defineComponent({
  name: 'home',
  components: {
    HelloWorld,
  },
})
</script>
