<template>
  <div class="dashboard">
    <div class="pc-nav">
      <div class="nav">
        <!-- LOGO -->
        <div class="logo">
          <router-link to="/">
            <img src="./../../assets/i/EasyPicker.png" alt="logo" />
          </router-link>
        </div>
        <input type="checkbox" id="navActive" />
        <nav>
          <label
            for="navActive"
            class="nav-item"
            v-for="(n, idx) in pcNavs"
            :key="idx"
            :class="{
              active: navActiveIdx === idx,
            }"
            @click="handleNav(idx)"
          >{{ n.title }}</label>
        </nav>
        <div class="mask"></div>
      </div>
      <!-- 移动端展示 -->
      <span id="navMenu">
        <label for="navActive">
          <el-icon size="32">
            <Expand />
          </el-icon>
        </label>
      </span>
      <span class="exit" @click="handleLogout">
        退出
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
      </span>
    </div>
    <router-view></router-view>
  </div>
</template>
<script lang="ts" setup>
import {
  Expand,
} from '@element-plus/icons-vue'

import {
  onMounted, reactive, ref,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UserApi } from '@/apis'

const $router = useRouter()
const $store = useStore()
const $route = useRoute()

const pcNavs: any[] = reactive([
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
const handleNav = (idx: number) => {
  const n = pcNavs[idx]
  if (!n.isExternal && idx !== navActiveIdx.value) {
    $router.push({
      path: n.path,
    })
    navActiveIdx.value = idx
  }
  if (n.isExternal) {
    window.open(n.path, '_blank')
  }
}

const handleLogout = () => {
  ElMessageBox.confirm('确认退出登录？', '登出提示')
    .then(() => {
      $store.commit('user/setToken', null)
      $router.replace({
        name: 'home',
      })
    }).catch(() => {
      ElMessage.info('取消')
    })
}

onMounted(() => {
  // 动态修改active的项
  navActiveIdx.value = pcNavs.findIndex((v) => v.path === $route.path)

  // 动态添加管理页面相关路由
  const isAlreadyAdd = $router.getRoutes().find((r) => r.name === 'manage')
  UserApi.checkPower().then((r) => {
    const isSuperAdmin = r.data
    $store.commit('user/setSuperAdmin', isSuperAdmin)
    console.log(isSuperAdmin)
    if (isSuperAdmin) {
      const superNavs = [
        {
          title: '应用管理',
          path: '/dashboard/manage',
        },
        {
          title: '网站监控',
          path: 'https://www.frontjs.com/app/87c1ef7667a513f313b4abb22a88dc78',
          isExternal: true,
        }]
      pcNavs.push(...superNavs)
      if (isAlreadyAdd) return
      const Manage = () => import('@/pages/dashboard/manage/index.vue')
      const Overview = () => import('@/pages/dashboard/manage/overview/index.vue')
      const User = () => import('@/pages/dashboard/manage/user/index.vue')
      $router.addRoute('dashboard', {
        name: 'manage',
        path: 'manage',
        component: Manage,
        redirect: {
          name: 'overview',
        },
        children: [
          {
            name: 'overview',
            path: 'overview',
            component: Overview,
            meta: {
              title: '应用概况',
            },
          },
          {
            name: 'user',
            path: 'user',
            component: User,
            meta: {
              title: '用户列表',
            },
          },
        ],
      })
    }
  })
})

</script>
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
@media screen and (max-width: 700px) {
  #navActive {
    display: block;
    position: fixed;
    left: 0;
    top: 0;
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
