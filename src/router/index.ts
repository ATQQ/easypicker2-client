import { createRouter, createWebHistory } from 'vue-router'
import registerRouteGuard from './Interceptor'
import routes from './routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_ROUTER_BASE as string),
  routes,
})

// 注册路由守卫
registerRouteGuard(router)

export default router
