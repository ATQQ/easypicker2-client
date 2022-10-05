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
          <template #title>概况</template>
        </el-menu-item>
        <el-menu-item index="user">
          <el-icon>
            <User />
          </el-icon>
          <template #title>用户</template>
        </el-menu-item>
        <el-menu-item index="wish">
          <el-icon>
            <DataBoard />
          </el-icon>
          <template #title>需求</template>
        </el-menu-item>
        <el-menu-item index="config">
          <el-icon>
            <Setting />
          </el-icon>
          <template #title>配置</template>
        </el-menu-item>
      </el-menu>
    </div>
    <div class="container">
      <router-view></router-view>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { User, DataBoard, DataAnalysis, Setting } from '@element-plus/icons-vue'

const defaultActive = ref('overview')
const isCollapse = ref(false)
const $router = useRouter()
const $route = useRoute()
const handleSelect = (path: string) => {
  if ($route.path.endsWith(path)) {
    return
  }
  $router.replace({
    path
  })
}
onMounted(() => {
  const value = $route.path.split('/').slice(-1)[0]
  defaultActive.value = value
})
</script>

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
    padding: 10px 0;
    width: 100%;
  }
  .navs {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }

  .el-radio-group {
    display: none;
  }
  .el-menu-nav {
    display: flex;
  }
  .container {
    padding-left: 0;
    margin-top: 30px;
    width: 100%;
  }
}
</style>
