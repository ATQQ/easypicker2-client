<template>
  <router-view></router-view>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'

export default defineComponent({
  name: 'App',
})
</script>

<style>
*{
  padding:0;
  margin:0;
}
a{
  text-decoration: none;
}
.tc{
  text-align: center;
}
.p10{
  padding: 10px;
}
</style>
