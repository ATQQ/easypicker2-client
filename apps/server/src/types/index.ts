export interface GlobalSiteConfig {
  maxInputLength: number
  openPraise: boolean
  formLength: number
  downloadOneExpired: number
  downloadCompressExpired: number
  compressSizeLimit: number
  needBindPhone: boolean
  enableCodeLogin: boolean
  supportPhoneCode?: boolean
  supportCodeLogin?: boolean
  /** 是否启用 SMTP 邮件服务 */
  enableSmtp?: boolean
  /** 开启且 SMTP 配置完整时展示邮箱验证码登录 */
  enableEmailCodeLogin?: boolean
  supportEmailCodeLogin?: boolean
  /** 开启且 SMTP 配置完整时，注册必须绑定邮箱 */
  needBindEmail?: boolean
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
  announcementTop?: SiteAnnouncementTopConfig
  announcementModal?: SiteAnnouncementModalConfig
}

export type SiteAnnouncementTheme = 'info' | 'success' | 'warning' | 'danger'

export interface SiteAnnouncementTopConfig {
  enabled: boolean
  title?: string
  content: string
  renderHtml?: boolean
  theme: SiteAnnouncementTheme
  closable: boolean
}

export interface SiteAnnouncementModalConfig {
  enabled: boolean
  title: string
  content: string
  renderHtml?: boolean
  theme: SiteAnnouncementTheme
  showTimes: number
  confirmText?: string
}

export interface DownloadLogAnalyzeItem {
  size: number
  count: number
}
