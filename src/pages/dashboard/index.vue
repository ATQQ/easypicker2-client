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
          <el-icon  size="32">
            <Expand/>
          </el-icon>
        </label>
      </span>
      <el-popover placement="left" v-model:visible="visible">
        <p>确定退出登录吗？</p>
        <div style="text-align: right; margin: 0">
          <el-button size="small" type="text" @click="visible = false">取消</el-button>
          <el-button type="primary" size="small" @click="logout">确定</el-button>
        </div>
        <template #reference>
          <span class="exit" @click="visible = true">
            退出
            <el-icon size="16">
              <CircleCloseFilled/>
            </el-icon>
          </span>
        </template>
      </el-popover>
    </div>
    <router-view></router-view>
  </div>
</template>
<script lang="ts" setup>
import {
  Expand, CircleCloseFilled,
} from '@element-plus/icons-vue'

import {
  onMounted, reactive, ref,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
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

const visible = ref(false)
const logout = () => {
  $store.commit('user/setToken', null)
  $router.replace({
    name: 'home',
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
        +.mask {
          display: block;
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          top: 50px;
          background-color: rgba(0,0,0,0.5);
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
