<template>
    <div>
        <h1>About Page</h1>
        <h2>{{ count }}</h2>
    </div>
</template>
<script lang="ts">
import { computed, defineComponent } from 'vue'
import { useStore } from 'vuex'

export default defineComponent({
  setup() {
    const store = useStore()
    return {
      count: computed(() => store.state.m1.count),
    }
  },
})
</script>
<style lang="scss" scoped>
h2{
    color: red;
}
</style>
