<script lang="ts" setup>
import { DataAnalysis, DataBoard, Setting, User } from '@element-plus/icons-vue'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const defaultActive = ref('overview')
const isCollapse = ref(false)
const $router = useRouter()
const $route = useRoute()
function handleSelect(path: string) {
  if ($route.path.endsWith(path)) {
    return
  }
  $router.replace({
    path,
  })
}
onMounted(() => {
  const value = $route.path.split('/').slice(-1)[0]
  defaultActive.value = value
})
</script>

<template>
  <div class="monitor">
    <div class="navs">
      <el-menu
        :default-active="defaultActive"
        class="el-menu-nav"
        :collapse="isCollapse"
        @select="handleSelect"
      >
        <el-menu-item index="overview">
          <el-icon>
            <DataAnalysis />
          </el-icon>
          <template #title>
            概况
          </template>
        </el-menu-item>
        <el-menu-item index="user">
          <el-icon>
            <User />
          </el-icon>
          <template #title>
            用户
          </template>
        </el-menu-item>
        <el-menu-item index="wish">
          <el-icon>
            <DataBoard />
          </el-icon>
          <template #title>
            需求
          </template>
        </el-menu-item>
        <el-menu-item index="config">
          <el-icon>
            <Setting />
          </el-icon>
          <template #title>
            配置
          </template>
        </el-menu-item>
      </el-menu>
    </div>
    <div class="container">
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.monitor {
  width: 96%;
  /* min-height: 100vh; */
  padding: 10px;
  overflow: hidden;
  display: flex;
}
.navs {
  min-width: 140px;
}
.container {
  padding-left: 20px;
  flex-grow: 1;
  width: calc(100% - 150px);
}

@media screen and (max-width: 700px) {
  .monitor {
    margin-top: 70px;
    padding: 10px 0 0;
    width: 100%;
    display: block;
    overflow: visible;
  }

  .navs {
    width: 100%;
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    box-sizing: border-box;
  }

  .el-radio-group {
    display: none;
  }

  .el-menu-nav {
    display: inline-flex;
    min-width: max-content;
    border-right: 0;
    border-bottom: solid 1px var(--el-menu-border-color);
  }

  .el-menu-nav :deep(.el-menu-item) {
    flex-shrink: 0;
    height: 44px;
    line-height: 44px;
    padding: 0 14px;
  }

  .container {
    padding-left: 0;
    margin-top: 12px;
    width: 100%;
  }
}
</style>
