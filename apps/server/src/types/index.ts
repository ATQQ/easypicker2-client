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
}

export interface DownloadLogAnalyzeItem {
  size: number
  count: number
}
