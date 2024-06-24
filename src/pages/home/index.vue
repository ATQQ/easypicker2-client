<template>
  <div class="home">
    <!-- 顶部导航栏 -->
    <header>
      <HomeHeader />
    </header>
    <h1 class="title">EasyPicker</h1>

    <!-- 简介 -->
    <section class="introduce">
      <p v-for="(item, index) in introduces" :key="index">{{ item }}</p>
    </section>
    <section class="introduce">
      <p>
        <router-link to="/login">点我登陆</router-link>
      </p>
      <p v-if="supportRegister">
        <router-link to="/register">没有账号? 去注册</router-link>
      </p>
    </section>
    <footer>
      <!-- 底部导航栏 -->
      <HomeFooter />
    </footer>
  </div>
</template>
<script lang="ts" setup>
import { reactive } from 'vue'
import HomeHeader from '@components/HomeHeader/index.vue'
import HomeFooter from '@components/HomeFooter/index.vue'
import { useSupportRegister } from '@/composables/index'

const introduces: string[] = reactive([
  '一款在线文件收取助手',
  '自动归档,记录每次提交的文件信息与提交人信息',
  '随时随地下载,查看收取详细情况'
])

const supportRegister = useSupportRegister()
</script>

<style lang="scss" scoped>
.home {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  background-image: linear-gradient(to top, #30cfd0 0%, #330867 100%);
  min-height: 100vh;
}
.title {
  color: aliceblue;
  text-align: center;
  font-weight: lighter;
  font-size: 60px;
  padding-top: 22vh;
}
.introduce {
  padding: 10px;
  color: aliceblue;
  text-align: center;
  p {
    margin-top: 10px;
  }
  a {
    color: aliceblue;
    font-weight: bold;
  }
}
footer {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  // margin-top: 25vh;
}
</style>
