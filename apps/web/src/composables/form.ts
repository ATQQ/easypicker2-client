import { useLocalStorage } from '@vueuse/core'
import { computed, onMounted } from 'vue'
import { SuperOverviewApi } from '@/apis'
import { formatDate } from '@/utils/stringUtil'

export const defaultSiteConfig = {
  maxInputLength: 20, // 最大输入长度
  openPraise: false, // 是否开启赞赏相关提示文案
  feedbackEntryEnabled: true, // 是否开启问题反馈入口
  formLength: 10, // 表单项数量
  downloadOneExpired: 1, // 单个文件链接下载过期时间（min）
  downloadCompressExpired: 60, // 归档文件下载过期时间（min）
  compressSizeLimit: 10, // TODO: 压缩文件大小限制（GB）
  needBindPhone: false, // 是否需要绑定手机号
  enableCodeLogin: false, // 是否开启验证码登录
  enableSmtp: false, // 是否启用 SMTP 邮件服务
  enableEmailCodeLogin: false, // 是否开启邮箱验证码登录（需 SMTP）
  needBindEmail: false, // 是否强制注册绑定邮箱
  supportPhoneCode: false, // 是否支持手机号验证码（腾讯云短信配置完整）
  supportCodeLogin: false, // 是否支持验证码登录
  supportEmailCodeLogin: false, // 是否支持邮箱验证码登录
  storageMode: 'qiniu' as 'qiniu' | 'local', // 存储模式（与全局配置一致）
  maxUploadSizeMB: 500, // 本机存储时单文件上限（MB）
  limitSpace: false, // 是否限制空间
  limitWallet: false, // 是否限制费用
  qiniuOSSPrice: 0.099, // 七牛云存储价格
  qiniuCDNPrice: 0.28, // 七牛云CDN价格
  qiniuBackhaulTrafficPrice: 0.15, // 七牛云回源流量价格
  qiniuBackhaulTrafficPercentage: 0.8, // 七牛云回源流量占比
  qiniuCompressPrice: 0.05, // 七牛云压缩价格
  moneyStartDay: +new Date('2024-06-01'),
  appName: '轻取', // 应用名称
  filePagePraiseText: '如果你觉得应用不错，',
  filePagePraiseLinkText: '给他发电⚡',
  filePagePraiseLink: 'http://docs.ep.sugarat.top/praise/index.html',
  filePageContactText: '，其它问题',
  filePageContactLinkText: '联系作者🔗',
  filePageContactLink: 'https://docs.ep.sugarat.top/author.html#%E8%81%94%E7%B3%BB%E4%BD%9C%E8%80%85',
  filePageFloatingContactEnabled: false, // 是否开启右下角联系入口
  filePageLimitText: '由于部分用户用量较大，小站无法承担这笔开销，限制每个账户为 2GB 可用空间，2￥的默认余额',
  filePageSponsorText: '你可以通过',
  filePageSponsorLinkText: ' 联系作者进行赞助⚡ ',
  filePageSponsorLink: 'https://docs.ep.sugarat.top/author.html#%E8%81%94%E7%B3%BB%E4%BD%9C%E8%80%85',
  filePageSponsorSuffix: '调整空间 和 可用余额',
  filePageSelfHostLinkText: '也可以选择自己搭建💡',
  filePageSelfHostLink: 'https://docs.ep.sugarat.top/',
  announcementTop: {
    enabled: false,
    title: '',
    content: '',
    renderHtml: false,
    theme: 'info' as OverviewApiTypes.SiteAnnouncementTheme,
    closable: true,
  },
  announcementModal: {
    enabled: false,
    title: '通告',
    content: '',
    renderHtml: false,
    theme: 'info' as OverviewApiTypes.SiteAnnouncementTheme,
    showTimes: 1,
    confirmText: '知道了',
  },
}

function mergeSiteConfig(
  config: Partial<typeof defaultSiteConfig>,
  base: typeof defaultSiteConfig = defaultSiteConfig,
) {
  return Object.keys(defaultSiteConfig).reduce<typeof defaultSiteConfig>((pre, key) => {
    const typedKey = key as keyof typeof defaultSiteConfig
    const hasField = Object.hasOwn(config, typedKey)
    const value = config[typedKey]
    const baseValue = base[typedKey]
    if (!hasField) {
      ;(pre as Record<string, unknown>)[key] = baseValue
      return pre
    }
    ;(pre as Record<string, unknown>)[key]
      = value && typeof value === 'object' && !Array.isArray(value)
        ? { ...baseValue, ...value }
        : value ?? baseValue
    return pre
  }, { ...base })
}

export function useSiteConfig(scope?: OverviewApiTypes.GlobalConfigScope) {
  const value = useLocalStorage('siteConfig', defaultSiteConfig)

  const moneyStartDay = computed(() => formatDate(value.value.moneyStartDay))
  onMounted(() => {
    SuperOverviewApi.getGlobalConfig('site', scope).then((res) => {
      value.value = mergeSiteConfig(res.data, value.value)
    })
  })

  return {
    value,
    moneyStartDay,
  }
}

export function useAccountConfig() {
  const value = useLocalStorage('siteConfig', defaultSiteConfig)

  onMounted(() => {
    SuperOverviewApi.getAccountGlobalConfig('site').then((res) => {
      value.value = mergeSiteConfig(res.data, value.value)
    })
  })

  return {
    value,
  }
}

export function useSiteAllConfig() {
  const value = useLocalStorage('siteConfig', defaultSiteConfig)

  onMounted(() => {
    SuperOverviewApi.getGlobalAllConfig('site').then((res) => {
      value.value = mergeSiteConfig(res.data, value.value)
    })
  })

  const updateValue = () => {
    return SuperOverviewApi.updateGlobalConfig('site', value.value)
  }
  return {
    value,
    updateValue,
  }
}
