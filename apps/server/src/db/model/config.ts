export type UserConfigType =
  | 'mysql'
  | 'redis'
  | 'mongo'
  | 'qiniu'
  | 'server'
  | 'tx'
  | 'global'
export interface UserConfig {
  type: UserConfigType
  key: string
  value: string | string | boolean | Record<string, any>
  isSecret: boolean
  lastUpdate?: Date
  originData?: Record<string, any>
}
