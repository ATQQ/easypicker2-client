export interface GlobalSiteConfig {
  maxInputLength: number
  openPraise: boolean
  formLength: number
  downloadOneExpired: number
  downloadCompressExpired: number
  compressSizeLimit: number
  needBindPhone: boolean
  enableCodeLogin: boolean
  supportCodeLogin?: boolean
  limitSpace: boolean
  limitWallet: boolean
  qiniuOSSPrice: number
  qiniuCDNPrice: number
  qiniuBackhaulTrafficPrice: number
  qiniuBackhaulTrafficPercentage: number
  qiniuCompressPrice: number
  moneyStartDay: number
  appName: string
}

export interface DownloadLogAnalyzeItem {
  size: number
  count: number
}
