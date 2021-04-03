<template>
    <div>
        <el-button type="primary">{{msg}}</el-button>
    </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  setup() {
    const msg = 'Element Button'
    return {
      msg,
    }
  },
})
</script>
