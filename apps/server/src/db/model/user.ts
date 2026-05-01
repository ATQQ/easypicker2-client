/**
 * 用户权限
 */
export enum USER_POWER {
  /**
   * 正常
   */
  NORMAL = 6,
  /**
   * 超级管理员
   */
  SUPER = 0,
  /**
   * 系统账号（只能维护系统后端服务）
   */
  SYSTEM
}

/**
 * 用户状态
 */
export enum USER_STATUS {
  /**
   * 正常
   */
  NORMAL,
  /**
   * 冻结
   */
  FREEZE,
  /**
   * 封禁
   */
  BAN
}

export interface User {
  id?: number
  account?: string
  phone?: string
  password?: string
  power?: USER_POWER
  status?: USER_STATUS
  join_time?: Date
  joinTime?: Date
  login_time?: Date
  /**
   * 最后登录时间
   */
  loginTime?: Date
  open_time?: Date
  /**
   * 解封时间
   */
  openTime?: Date
  login_count?: number
  loginCount?: number
  /**
   * 可使用存储空间（单位：GB）
   */
  size?: number
  wallet?: number
}
