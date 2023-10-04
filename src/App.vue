<template>
  <el-config-provider size="large" :zIndex="1000" :locale="zhCn">
    <router-view style="min-height: 100vh"></router-view>
  </el-config-provider>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue'
import { useStore } from 'vuex'
import { ElConfigProvider } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

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
