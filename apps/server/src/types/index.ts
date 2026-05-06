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
  /** 开启且 SMTP 配置完整时展示邮箱验证码登录 */
  enableEmailCodeLogin?: boolean
  supportEmailCodeLogin?: boolean
  /** 逗号/分号分隔的管理员告警收件邮箱 */
  alertEmails?: string
  /** 全局每日发信上限（0 表示不限制） */
  emailDailyLimit?: number
  /** qiniu：七牛直传；local：上传到本机 */
  storageMode?: 'qiniu' | 'local'
  /** 本模式下单个文件最大 MB */
  maxUploadSizeMB?: number
  limitSpace: boolean
  limitWallet: boolean
  qiniuOSSPrice: number
  qiniuCDNPrice: number
  qiniuBackhaulTrafficPrice: number
  qiniuBackhaulTrafficPercentage: number
  qiniuCompressPrice: number
  moneyStartDay: number
  appName: string
  filePagePraiseText: string
  filePagePraiseLinkText: string
  filePagePraiseLink: string
  filePageContactText: string
  filePageContactLinkText: string
  filePageContactLink: string
  filePageFloatingContactEnabled: boolean
  filePageLimitText: string
  filePageSponsorText: string
  filePageSponsorLinkText: string
  filePageSponsorLink: string
  filePageSponsorSuffix: string
  filePageSelfHostLinkText: string
  filePageSelfHostLink: string
  feedbackEntryEnabled?: boolean
}

export interface DownloadLogAnalyzeItem {
  size: number
  count: number
}
