<script lang="ts" setup>
import { ElConfigProvider } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import { useSiteConfig } from './composables'

const { value: siteConfig } = useSiteConfig()
</script>

<template>
  <ElConfigProvider size="large" :z-index="1000" :locale="zhCn">
    <el-alert v-if="siteConfig.openPraise" center type="error">
      <template #title>
        ☕️ 支持一下作者 👉🏻
        <el-link href="https://sugarat.top/essay/dev/afdian.html" type="primary">
          爱发电
        </el-link>
        |
        <el-link href="https://docs.ep.sugarat.top/praise/" type="success">
          赞赏
        </el-link>
      </template>
    </el-alert>
    <router-view style="min-height: 100vh" />
  </ElConfigProvider>
</template>

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
