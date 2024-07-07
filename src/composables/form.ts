import { useLocalStorage } from '@vueuse/core'
import { onMounted } from 'vue'
import { SuperOverviewApi } from '@/apis'

export function useSiteConfig() {
  const value = useLocalStorage('siteConfig', {
    maxInputLength: 20, // 最大输入长度
    openPraise: false, // 是否开启赞赏相关提示文案
    formLength: 10, // 表单项数量
    downloadOneExpired: 1, // 单个文件链接下载过期时间（min）
    downloadCompressExpired: 60, // 归档文件下载过期时间（min）
    compressSizeLimit: 10, // 压缩文件大小限制（GB）
    needBindPhone: false, // 是否需要绑定手机号
    limitSpace: false, // 是否限制空间
  })

  onMounted(() => {
    SuperOverviewApi.getGlobalConfig('site').then((res) => {
      value.value = res.data
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
