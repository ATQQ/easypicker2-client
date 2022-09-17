<template>
  <el-config-provider size="large" :zIndex="1000">
    <router-view></router-view>
  </el-config-provider>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue'
import { useStore } from 'vuex'
import { ElConfigProvider } from 'element-plus'

const $store = useStore()
const refreshWidth = () => {
  const clientWIdth = window.document.body.clientWidth
  $store.commit('public/setWidth', clientWIdth)
}
onMounted(() => {
  window.addEventListener('load', refreshWidth)
  window.addEventListener('resize', refreshWidth)
})
</script>

<style>
@import './assets/styles/app.css';

* {
  padding: 0;
  margin: 0;
}
a {
  text-decoration: none;
}
</style>
