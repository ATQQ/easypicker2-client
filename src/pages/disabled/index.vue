<template>
  <div class="not-found">
    <h1>EasyPicker | 轻取</h1>
    <h2>{{ $route.query.title }}：已被网站管理员禁用</h2>
    <h3><a @click="handleToHome">查看应用介绍</a></h3>
  </div>
</template>
<script lang="ts" setup>
import { useRoute } from 'vue-router'

const $route = useRoute()
const handleToHome = () => {
  window.location.href = 'https://docs.ep.sugarat.top/'
}
</script>
<style lang="scss" scoped>
.not-found {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  background-image: linear-gradient(to top, #30cfd0 0%, #330867 100%);
  min-height: 100vh;
}
h1,
h2,
h3,
a {
  color: aliceblue;
  text-align: center;
  font-weight: lighter;
}
a {
  margin-left: 10px;
  border-bottom: 2px solid aliceblue;
  cursor: pointer;
}
h1 {
  font-size: 48px;
  padding-top: 10%;
}
h2 {
  font-size: 30px;
  padding-top: 2vh;
}
h3 {
  font-size: 28px;
  padding-top: 1vh;
}
</style>
