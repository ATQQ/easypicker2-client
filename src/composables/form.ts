import { useLocalStorage } from '@vueuse/core'
import { onMounted } from 'vue'
import { SuperOverviewApi } from '@/apis'

export function useSiteConfig() {
  const value = useLocalStorage('siteConfig', {
    maxInputLength: 20, // 最大输入长度
    openPraise: false, // 是否开启赞赏相关提示文案
    formLength: 10, // 表单项数量
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
