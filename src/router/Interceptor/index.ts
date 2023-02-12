import { Router } from 'vue-router'
import axios from 'axios'
import $store from '@/store'
import { PublicApi, SuperOverviewApi, UserApi } from '@/apis'

declare module 'vue-router' {
  interface RouteMeta {
    // 是否管理员页面
    isAdmin?: boolean
    isSystem?: boolean
    // 是否需要登录
    requireLogin?: boolean
    // 路由title
    title?: string
    // 是否可以禁用
    allowDisabled?: boolean
  }
}

function registerRouteGuard(router: Router) {
  /**
   * 全局前置守卫
   */
  router.beforeEach((to, from) => {
    // 上报PV
    const { fullPath } = to
    PublicApi.reportPv(fullPath)

    if (!import.meta.env.VITE_APP_PV_PATH.includes(window.location.hostname)) {
      axios.get(
        `//${
          import.meta.env.VITE_APP_PV_PATH
        }/public/report/pv?path=${encodeURIComponent(window.location.href)}`
      )
    }

    // 更改title
    window.document.title = `${import.meta.env.VITE_APP_TITLE} ${to.meta.title}`

    // if (to.meta.requireLogin) {
    //   if (from.path === '/') {
    //     return from
    //   }
    //   return false
    // }
    return true
  })

  /**
   * 全局解析守卫
   */
  router.beforeResolve(async (to) => {
    if (to.meta.isAdmin || to.meta.isSystem) {
      try {
        const powerData = (await UserApi.checkPower()).data
        $store.commit('user/setSuperAdmin', powerData.power)
        $store.commit('user/setSystem', powerData.system)
        if (to.meta.isSystem) {
          return (
            powerData.system || {
              name: '404'
            }
          )
        }

        if (to.meta.isAdmin) {
          return (
            powerData.power || {
              name: '404'
            }
          )
        }
      } catch (error) {
        // if (error instanceof NotAllowedError) {
        //     // ... 处理错误，然后取消导航
        //     return false
        // } else {
        //     // 意料之外的错误，取消导航并把错误传给全局处理器
        //     throw error
        // }
        console.error(error)
        return false
      }
    }
    return true
  })

  /**
   * 全局后置守卫
   */
  router.afterEach((to, from, failure) => {
    if (to.meta.allowDisabled) {
      SuperOverviewApi.checkDisabledRoute(to.path).then((v) => {
        if (v.data.status) {
          router.replace({
            name: 'disable',
            query: {
              title: to.meta.title || to.path
            }
          })
        }
      })
    }
    // 改标题,监控上报一些基础信息
    // sendToAnalytics(to.fullPath)
    if (failure) {
      console.error(failure)
    }
  })
}

export default registerRouteGuard
