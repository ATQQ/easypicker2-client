import { Router } from 'vue-router'

declare module 'vue-router' {
    interface RouteMeta {
        // 是可选的
        isAdmin?: boolean
        // 是否需要登录
        requireLogin?: boolean
    }
}

function registerRouteGuard(router: Router) {
  /**
     * 全局前置守卫
     */
  router.beforeEach((to, from) => {
    if (to.meta.requireLogin) {
      if (from.path === '/') {
        return from
      }
      return false
    }
    return true
  })

  /**
     * 全局解析守卫
     */
  router.beforeResolve(async (to) => {
    if (to.meta.isAdmin) {
      try {
        console.log(to)
      } catch (error) {
        // if (error instanceof NotAllowedError) {
        //     // ... 处理错误，然后取消导航
        //     return false
        // } else {
        //     // 意料之外的错误，取消导航并把错误传给全局处理器
        //     throw error
        // }
        console.error(error)
      }
    }
  })

  /**
     * 全局后置守卫
     */
  router.afterEach((to, from, failure) => {
    // 改标题,监控上报一些基础信息
    // sendToAnalytics(to.fullPath)
    if (failure) {
      console.error(failure)
    }
  })
}

export default registerRouteGuard
