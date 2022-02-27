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
.el-progress{
  margin-top: 0 !important;
  position: static !important;
}
.el-progress__text{
  top: 8px !important;
}
* {
  padding: 0;
  margin: 0;
}
a {
  text-decoration: none;
}
.tc {
  text-align: center;
}
.p10 {
  padding: 10px;
}

@media screen and (max-width: 700px) {
  .el-message-box {
    width: auto;
  }
  .el-pagination {
    white-space: break-spaces;
  }
  .el-pagination > * {
    margin-bottom: 10px;
  }
}
</style>
