import 'flash-wolves'
import type { USER_POWER, User } from './db/model/user'

declare module 'flash-wolves' {
  interface RouteMeta {
    // 权限
    userPower?: USER_POWER
    // 需要登录
    needLogin?: boolean
    // 跨域支持
    CORS?: boolean
  }

  interface FWRequest {
    userInfo?: User
    startTime?: number
  }
}
