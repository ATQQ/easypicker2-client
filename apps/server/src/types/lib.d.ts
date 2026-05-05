declare namespace Qiniu {
  interface ItemInfo {
    key: string
    hash: string
    fsize: number
    mimeType: string
    putTime: number
    type: number
    status: 0
    md5: string
  }
}
interface ServiceStatus {
  type: 'mysql' | 'qiniu' | 'redis' | 'mongodb' | 'tx'
  status: boolean
  errMsg?: string
}
