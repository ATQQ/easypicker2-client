<script lang="ts" setup>
import HomeFooter from '@components/HomeFooter/index.vue'
import { ArrowDown, Close, Expand } from '@element-plus/icons-vue'

import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { UserApi } from '@/apis'
import MessagePanel from '@/components/MessagePanel/index.vue'
import { useIsMobile } from '@/composables'

const isMobile = useIsMobile()

const $router = useRouter()
const $store = useStore()
const $route = useRoute()
const navList = reactive<
  { title: string, path: string, isExternal?: boolean }[]
>([
  {
    title: '文件管理',
    path: '/dashboard/files',
  },
  {
    title: '任务管理',
    path: '/dashboard/tasks',
  },
])
const navActiveIdx = ref(0)
function handleNav(idx: number) {
  const n = navList[idx]
  if (!n.isExternal && idx !== navActiveIdx.value) {
    $router.push({
      path: n.path,
    })
  }
  if (n.isExternal) {
    window.open(n.path, '_blank')
  }
}

// 自动切换激活的标题栏
watch(
  () => $route.path,
  (path: string) => {
    const idx = navList.findIndex(n => path.startsWith(n.path))
    if (idx !== -1) {
      navActiveIdx.value = idx
    }
  },
)

function handleLogout() {
  ElMessageBox.confirm('确认退出登录？', '登出提示', {
    draggable: true,
  })
    .then(() => {
      // 登出接口
      UserApi.logout().finally(() => {
        $store.commit('user/setToken', null)
        $router.replace({
          name: 'home',
        })
      })
    })
    .catch(() => {
      ElMessage.info('取消')
    })
}
const userName = ref('World')

function refreshActiveTab() {
  // 动态修改active的项
  navActiveIdx.value = navList.findIndex(v => $route.path.startsWith(v.path))
}
onMounted(() => {
  // 动态添加管理页面入口
  UserApi.checkPower().then((r) => {
    const isSuperAdmin = r.data?.power
    userName.value = r.data?.name
    $store.commit('user/setSuperAdmin', isSuperAdmin)
    if (isSuperAdmin) {
      const superNavList = [
        {
          title: '应用管理',
          path: '/dashboard/manage',
        },
        {
          title: '网站监控',
          path: '/dashboard/metrics',
        },
      ]
      navList.push(...superNavList)
    }
    const isSystem = r.data?.system
    if (isSystem) {
      navList.splice(0, navList.length)
      navList.push({
        title: '系统管理',
        path: '/dashboard/config',
      })
    }
    refreshActiveTab()
  })
})
</script>

<template>
  <div class="dashboard">
    <div class="pc-nav">
      <div class="nav">
        <!-- LOGO -->
        <div class="logo">
          <router-link to="/">
            <img
              src="https://img.cdn.sugarat.top/easypicker/EasyPicker.png"
              alt="logo"
            >
          </router-link>
        </div>
        <input v-if="isMobile" id="navActive" type="checkbox">
        <nav>
          <label v-if="isMobile" for="navActive" class="nav-item">
            <span>Hello💐，</span>
            {{ userName }}
          </label>
          <label
            v-for="(n, idx) in navList"
            :key="idx"
            for="navActive"
            class="nav-item"
            :class="{
              active: navActiveIdx === idx,
            }"
            @click="handleNav(idx)"
          >{{ n.title }}</label>
          <label
            v-if="isMobile"
            for="navActive"
            class="nav-item"
            @click="handleLogout"
          >
            <span style="margin-right: 6px">退出</span>
            <el-icon size="16">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                data-v-53d86618
              >
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M10.6667 2.55473C13.0212 3.58347 14.6667 5.93291 14.6667 8.66667C14.6667 12.3486 11.6819 15.3333 8 15.3333C4.3181 15.3333 1.33333 12.3486 1.33333 8.66667C1.33333 5.93291 2.97879 3.58347 5.33333 2.55473V4.04684C3.7392 4.969 2.66667 6.69259 2.66667 8.66667C2.66667 11.6122 5.05448 14 8 14C10.9455 14 13.3333 11.6122 13.3333 8.66667C13.3333 6.69259 12.2608 4.969 10.6667 4.04684V2.55473ZM7.33333 8.66667V1.33333C7.33333 1.14924 7.48257 1 7.66667 1H8.33333C8.51743 1 8.66667 1.14924 8.66667 1.33333V8.66667C8.66667 8.85076 8.51743 9 8.33333 9H7.66667C7.48257 9 7.33333 8.85076 7.33333 8.66667Z"
                  fill="#86909C"
                  data-v-53d86618
                />
              </svg>
            </el-icon>
          </label>
        </nav>
        <div class="mask" />
      </div>
      <!-- 移动端展示 -->
      <span id="navMenu">
        <MessagePanel v-if="isMobile" class="mobile-message-bell" />
        <label for="navActive">
          <el-icon size="32">
            <Expand />
          </el-icon>
        </label>
      </span>
      <div v-if="!isMobile" class="flex fac">
        <MessagePanel />
        <span>Hello 💐，</span>
        <el-dropdown class="exit">
          <span class="exit-info">
            <span class="ellipsis">{{ userName }}</span>
            <el-icon>
              <ArrowDown />
            </el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :icon="Close" @click="handleLogout">
                退出
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
    <router-view />
    <div>
      <HomeFooter type="dashboard" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.dashboard {
  background-color: #fafafa;
}
.pc-nav {
  background-color: #fff;
  display: flex;
  padding: 10px;
  justify-content: space-between;
  align-items: center;
  .exit {
    cursor: pointer;
    display: flex;
    align-items: center;
    .exit-info {
      display: flex;
      justify-content: center;
      align-items: center;
      > span {
        margin-right: 5px;
        display: block;
        max-width: 70px;
      }
    }
  }
  .nav {
    display: flex;
    nav {
      display: flex;
      align-items: center;
      .nav-item {
        font-size: 1rem;
        color: #595959;
        padding: 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        &.active {
          color: #409eff !important;
          font-weight: 600;
        }
      }
    }
    .exit {
      color: #595959;
    }
  }
  .logo {
    width: 180px;
    margin: 0 10px;
    img {
      height: 40px;
    }
  }
}
#navActive {
  display: none;
  opacity: 0;
}
#navMenu {
  display: none;
}
.mobile-message-bell {
  display: none;
  position: fixed;
  right: 0;
  top: 0;
}
@media screen and (max-width: 700px) {
  #navActive {
    display: block;
    position: fixed;
    left: 0;
    top: 0;
  }
  .mobile-message-bell {
    display: block;
  }
  #navMenu {
    cursor: pointer;
    display: block;
    position: absolute;
    left: 10px;
    top: 5px;
    font-size: 2rem;
  }
  .pc-nav {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    z-index: 6;
    .nav {
      flex-wrap: wrap;
      width: 100%;
      .logo {
        width: 100%;
        text-align: center;
      }
    }
    #navActive {
      & + nav {
        display: none;
      }
    }
    #navActive:checked {
      & + nav {
        display: flex;
        flex-direction: column;
        width: 100%;
        position: absolute;
        z-index: 1;
        background: #fff;
        left: 0;
        top: 50px;
        + .mask {
          display: block;
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          top: 50px;
          background-color: rgba(0, 0, 0, 0.5);
        }
      }
    }
    .exit {
      position: absolute;
      right: 10px;
      top: 20px;
    }
  }
}
</style>
