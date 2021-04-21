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
        <nav>
          <div
            class="nav-item"
            v-for="(n, idx) in pcNavs"
            :key="idx"
            :class="{
              active: navActiveIdx === idx,
            }"
            @click="handleNav(idx)"
          >
            {{ n.title }}
          </div>
        </nav>
      </div>
      <el-popover placement="top" :width="160" v-model:visible="visible">
        <p>确定退出登录吗？</p>
        <div style="text-align: right; margin: 0">
          <el-button size="mini" type="text" @click="visible = false"
            >取消</el-button
          >
          <el-button type="primary" size="mini" @click="logout"
            >确定</el-button
          >
        </div>
        <template #reference>
          <span class="exit">
            退出
            <i class="el-icon-error"> </i>
          </span>
        </template>
      </el-popover>
    </div>
    <router-view></router-view>
  </div>
</template>
<script lang="ts">
import { UserApi } from '@/apis'
import {
  defineComponent, onMounted, reactive, ref,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'

export default defineComponent({
  setup() {
    const $router = useRouter()
    const $store = useStore()
    const pcNavs:any[] = reactive([
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
      const $route = useRoute()
      navActiveIdx.value = pcNavs.findIndex((v) => v.path === $route.path)

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
          const Manage = () => import('@/pages/dashboard/manage/index.vue')
          const Overview = () => import('@/pages/dashboard/manage/overview/index.vue')
          const User = () => import('@/pages/dashboard/manage/user/index.vue')
          $router.addRoute('dashboard', {
            name: 'manage',
            path: 'manage',
            component: Manage,
            meta: {
              requireLogin: false,
            },
            redirect: {
              name: 'overview',
            },
            children: [
              {
                name: 'overview',
                path: 'overview',
                component: Overview,
                meta: {
                  requireLogin: false,
                },
              },
              {
                name: 'user',
                path: 'user',
                component: User,
                meta: {
                  requireLogin: false,
                },
              },
            ],
          })
        }
      })
    })
    return {
      pcNavs,
      navActiveIdx,
      handleNav,
      visible,
      logout,
    }
  },
})
</script>
<style scoped lang="scss">
.dashboard{
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
</style>
