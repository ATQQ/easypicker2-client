// mongoDb
// 日志
export type LogType = 'request' | 'behavior' | 'error' | 'pv'

export type LogData =
  | LogRequestData
  | LogBehaviorData
  | PvData
  | LogErrorData
  | any
export interface Log {
  id?: string
  type?: LogType
  data?: LogData
}

export interface LogRequestData {
  method: string
  url: string
  query: any
  params: any
  body: any
  userAgent: string
  refer: string
  ip: string
  userId: number
  endTime?: number
  startTime?: number
  duration?: number
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace LogBehaviorData {
  type BehaviorInfoModule =
    | 'user'
    | 'taskInfo'
    | 'task'
    | 'people'
    | 'file'
    | 'category'
    | 'super'
    | 'public'
    | 'interceptor'
    | 'wish'
  interface Info {
    /**
     * 一句话描述
     */
    msg: string
    module: BehaviorInfoModule
    // 业务自定数据
    data?: any
  }

  interface Request {
    method: string
    path: string
    userAgent: string
    refer: string
    ip: string
  }

  interface User {
    userId: number
  }
}
export interface LogBehaviorData {
  req: LogBehaviorData.Request
  user: LogBehaviorData.User
  info: LogBehaviorData.Info
}

export interface LogErrorData {
  req: LogRequestData
  msg: string
  stack: any
}

export interface PvData {
  userAgent: string
  refer: string
  ip: string
  /**
   * 页面路径
   */
  path: string
}
